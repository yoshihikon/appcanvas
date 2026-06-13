import {
  getRun,
  listMessages,
  parseProposal,
} from "@/lib/db/repositories/generation";
import { isActive, subscribe, type GenEvent } from "@/lib/generation/orchestrator";

type RouteContext = { params: Promise<{ id: string; runId: string }> };

const TERMINAL = new Set(["done", "error", "canceled"]);

/** 生成ランのイベントを SSE で配信する */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id, runId } = await params;
  const run = getRun(id, runId);
  if (!run) {
    return new Response("not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // 初期スナップショット（再接続時の取りこぼし防止）
      send({
        type: "snapshot",
        status: run.status,
        proposal: parseProposal(run),
        messages: listMessages(id, runId).map((m) => ({
          role: m.role,
          message: JSON.parse(m.content),
        })),
      });

      // 既に終了済みなら閉じる
      if (TERMINAL.has(run.status) && !isActive(runId)) {
        controller.close();
        return;
      }

      const unsubscribe = subscribe(runId, (e: GenEvent) => {
        send(e);
        if (e.type === "done" || e.type === "error") {
          cleanup();
          controller.close();
        } else if (e.type === "phase" && e.status === "canceled") {
          cleanup();
          controller.close();
        }
      });

      // 接続維持のためのハートビート
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      function cleanup() {
        clearInterval(heartbeat);
        unsubscribe();
      }
      // クライアント切断時の後始末
      _request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
