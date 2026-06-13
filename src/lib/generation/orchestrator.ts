import path from "node:path";
import { EventEmitter } from "node:events";
import { getProject } from "@/lib/db/repositories/projects";
import { createScreen, updateScreen } from "@/lib/db/repositories/screens";
import {
  addMessage,
  getRun,
  updateRun,
} from "@/lib/db/repositories/generation";
import { captureAndStore } from "@/lib/capture/store";
import { getWorkspaceDir } from "@/lib/storage/paths";
import { readSettings } from "@/lib/storage/settings";
import { sanitizeSkills } from "@/lib/agent/skills";
import { getAgent } from "@/lib/agent/client";
import type { DeviceType } from "@/lib/device";
import type {
  AgentMessage,
  ProjectContext,
  Proposal,
} from "./types";

export type GenEvent =
  | { type: "message"; role: "user" | "assistant" | "tool" | "system"; message: AgentMessage }
  | { type: "phase"; status: string }
  | { type: "proposal"; proposal: Proposal }
  | { type: "screen"; screenId: string; name: string; status: string }
  | { type: "error"; message: string }
  | { type: "done" };

type Controller = { emitter: EventEmitter; abort: AbortController };

const globalReg = globalThis as unknown as {
  __appcanvasGenControllers?: Map<string, Controller>;
  __appcanvasGenActive?: Set<string>;
};
function controllers() {
  globalReg.__appcanvasGenControllers ??= new Map();
  return globalReg.__appcanvasGenControllers;
}
function activeSet() {
  globalReg.__appcanvasGenActive ??= new Set();
  return globalReg.__appcanvasGenActive;
}

/** 購読/配信用のエミッタ。実行中フラグとは独立（生成しても active にはしない） */
function controllerFor(runId: string): Controller {
  const reg = controllers();
  let c = reg.get(runId);
  if (!c) {
    c = { emitter: new EventEmitter(), abort: new AbortController() };
    c.emitter.setMaxListeners(0);
    reg.set(runId, c);
  }
  return c;
}

/** 実行を開始する：active に登録し、新しい AbortController を割り当てる */
function beginOp(runId: string): Controller {
  activeSet().add(runId);
  const c = controllerFor(runId);
  c.abort = new AbortController();
  return c;
}

export function isActive(runId: string): boolean {
  return activeSet().has(runId);
}

export function subscribe(runId: string, listener: (e: GenEvent) => void): () => void {
  const c = controllerFor(runId);
  c.emitter.on("event", listener);
  return () => c.emitter.off("event", listener);
}

function emit(projectId: string, runId: string, event: GenEvent) {
  if (event.type === "message") {
    addMessage(projectId, runId, event.role, event.message);
  }
  controllerFor(runId).emitter.emit("event", event);
}

function finish(runId: string) {
  activeSet().delete(runId);
}

function buildContext(projectId: string): ProjectContext | null {
  const project = getProject(projectId);
  if (!project) return null;
  let skills: string[] = [];
  try {
    skills = sanitizeSkills(JSON.parse(project.skills));
  } catch {
    skills = [];
  }
  return {
    name: project.name,
    persona: project.persona,
    overview: project.overview,
    designSystem: project.designSystem,
    skills,
    defaultDevice: project.defaultDevice as DeviceType,
  };
}

function proposalPathFor(projectId: string, runId: string): string {
  return path.join(getWorkspaceDir(projectId), ".appcanvas", "runs", runId, "proposal.json");
}

const onMessage =
  (projectId: string, runId: string) => (m: AgentMessage) =>
    emit(projectId, runId, { type: "message", role: "assistant", message: m });

/** PROPOSING を開始（非同期実行・即時return） */
export function startProposing(projectId: string, runId: string): void {
  const c = beginOp(runId);
  void (async () => {
    try {
      const context = buildContext(projectId);
      const run = getRun(projectId, runId);
      if (!context || !run) throw new Error("run not found");

      const { proposal, agentSessionId } = await getAgent().propose({
        workspace: getWorkspaceDir(projectId),
        proposalPath: proposalPathFor(projectId, runId),
        input: run.input,
        context,
        model: readSettings().model,
        onMessage: onMessage(projectId, runId),
        signal: c.abort.signal,
      });

      updateRun(projectId, runId, { proposal, agentSessionId, status: "reviewing" });
      emit(projectId, runId, { type: "proposal", proposal });
      emit(projectId, runId, { type: "phase", status: "reviewing" });
    } catch (err) {
      handleError(projectId, runId, err);
    } finally {
      finish(runId);
    }
  })();
}

/** レビューでの指示反映（再検討） */
export function reviseRun(
  projectId: string,
  runId: string,
  instruction: string,
  current: Proposal,
): void {
  const c = beginOp(runId);
  updateRun(projectId, runId, { status: "proposing", proposal: current });
  emit(projectId, runId, { type: "phase", status: "proposing" });
  emit(projectId, runId, {
    type: "message",
    role: "user",
    message: { kind: "text", text: instruction },
  });
  void (async () => {
    try {
      const context = buildContext(projectId);
      const run = getRun(projectId, runId);
      if (!context || !run) throw new Error("run not found");
      const { proposal, agentSessionId } = await getAgent().revise({
        workspace: getWorkspaceDir(projectId),
        proposalPath: proposalPathFor(projectId, runId),
        input: run.input,
        context,
        model: readSettings().model,
        agentSessionId: run.agentSessionId ?? undefined,
        current,
        instruction,
        onMessage: onMessage(projectId, runId),
        signal: c.abort.signal,
      });
      updateRun(projectId, runId, { proposal, agentSessionId, status: "reviewing" });
      emit(projectId, runId, { type: "proposal", proposal });
      emit(projectId, runId, { type: "phase", status: "reviewing" });
    } catch (err) {
      handleError(projectId, runId, err);
    } finally {
      finish(runId);
    }
  })();
}

/** 構成案を確定して順次生成を開始 */
export function approveRun(
  projectId: string,
  runId: string,
  finalProposal: Proposal,
): void {
  const c = beginOp(runId);
  updateRun(projectId, runId, { status: "generating", proposal: finalProposal });
  emit(projectId, runId, { type: "phase", status: "generating" });
  void (async () => {
    try {
      const context = buildContext(projectId);
      const run = getRun(projectId, runId);
      if (!context || !run) throw new Error("run not found");
      const agent = getAgent();
      const ws = getWorkspaceDir(projectId);
      let sessionId = run.agentSessionId ?? undefined;

      const targets = finalProposal.screens.filter((s) => s.include);
      for (const proposed of targets) {
        if (c.abort.signal.aborted) break;

        const screen = createScreen(projectId, {
          name: proposed.name,
          description: proposed.description,
          groupName: proposed.group,
          device: proposed.device,
          status: "generating",
        });
        updateScreen(projectId, screen.id, { generationRunId: runId });
        emit(projectId, runId, {
          type: "screen",
          screenId: screen.id,
          name: screen.name,
          status: "generating",
        });

        try {
          const { html, agentSessionId } = await agent.generateScreen({
            workspace: ws,
            codePath: path.join(ws, "app", "screens", screen.id, "page.tsx"),
            previewPath: path.join(ws, ".appcanvas", screen.id, "preview.html"),
            screen: { ...proposed, id: screen.id },
            context,
            model: readSettings().model,
            agentSessionId: sessionId,
            onMessage: onMessage(projectId, runId),
            signal: c.abort.signal,
          });
          if (agentSessionId) sessionId = agentSessionId;
          await captureAndStore({ projectId, screenId: screen.id, html, device: screen.device });
          emit(projectId, runId, {
            type: "screen",
            screenId: screen.id,
            name: screen.name,
            status: "generated",
          });
        } catch (err) {
          updateScreen(projectId, screen.id, { status: "error" });
          const message = err instanceof Error ? err.message : "生成に失敗しました";
          emit(projectId, runId, {
            type: "message",
            role: "system",
            message: { kind: "notice", text: `「${screen.name}」の生成に失敗: ${message}` },
          });
          emit(projectId, runId, {
            type: "screen",
            screenId: screen.id,
            name: screen.name,
            status: "error",
          });
        }
      }

      updateRun(projectId, runId, { agentSessionId: sessionId, status: "done" });
      emit(projectId, runId, { type: "done" });
    } catch (err) {
      handleError(projectId, runId, err);
    } finally {
      finish(runId);
    }
  })();
}

export function cancelRun(projectId: string, runId: string): void {
  controllers().get(runId)?.abort.abort();
  updateRun(projectId, runId, { status: "canceled" });
  emit(projectId, runId, { type: "phase", status: "canceled" });
  finish(runId);
}

function handleError(projectId: string, runId: string, err: unknown) {
  const message = err instanceof Error ? err.message : "生成に失敗しました";
  updateRun(projectId, runId, { status: "error", error: message });
  emit(projectId, runId, { type: "error", message });
}
