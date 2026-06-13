import { and, eq } from "drizzle-orm";
import { openProjectDb } from "@/lib/db/client";
import {
  generationMessages,
  generationRuns,
  type GenerationMessage,
  type GenerationRun,
  type GenerationStatus,
} from "@/lib/db/schema";
import type { AgentMessage, Proposal } from "@/lib/generation/types";

export function createRun(
  projectId: string,
  input: { input: string; defaultDevice: string },
): GenerationRun {
  const db = openProjectDb(projectId);
  const now = new Date().toISOString();
  const run: GenerationRun = {
    id: crypto.randomUUID(),
    projectId,
    agentSessionId: null,
    status: "proposing",
    input: input.input,
    defaultDevice: input.defaultDevice,
    proposal: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(generationRuns).values(run).run();
  return run;
}

export function getRun(projectId: string, runId: string): GenerationRun | null {
  const db = openProjectDb(projectId);
  const row = db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.projectId, projectId), eq(generationRuns.id, runId)))
    .get();
  return row ?? null;
}

export function updateRun(
  projectId: string,
  runId: string,
  patch: {
    status?: GenerationStatus;
    proposal?: Proposal | null;
    agentSessionId?: string | null;
    error?: string | null;
  },
): void {
  const db = openProjectDb(projectId);
  const dbPatch: Partial<GenerationRun> = { updatedAt: new Date().toISOString() };
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.proposal !== undefined) {
    dbPatch.proposal = patch.proposal === null ? null : JSON.stringify(patch.proposal);
  }
  if (patch.agentSessionId !== undefined) dbPatch.agentSessionId = patch.agentSessionId;
  if (patch.error !== undefined) dbPatch.error = patch.error;
  db.update(generationRuns).set(dbPatch).where(eq(generationRuns.id, runId)).run();
}

export function parseProposal(run: GenerationRun): Proposal | null {
  if (!run.proposal) return null;
  try {
    return JSON.parse(run.proposal) as Proposal;
  } catch {
    return null;
  }
}

export function addMessage(
  projectId: string,
  runId: string,
  role: GenerationMessage["role"],
  payload: AgentMessage,
): GenerationMessage {
  const db = openProjectDb(projectId);
  const msg: GenerationMessage = {
    id: crypto.randomUUID(),
    runId,
    role,
    content: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  };
  db.insert(generationMessages).values(msg).run();
  return msg;
}

export function listMessages(
  projectId: string,
  runId: string,
): GenerationMessage[] {
  const db = openProjectDb(projectId);
  return db
    .select()
    .from(generationMessages)
    .where(eq(generationMessages.runId, runId))
    .all();
}
