import { NextResponse } from "next/server";
import { getRun } from "@/lib/db/repositories/generation";
import { cancelRun } from "@/lib/generation/orchestrator";

type RouteContext = { params: Promise<{ id: string; runId: string }> };

/** 生成ランを中断する */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id, runId } = await params;
  const run = getRun(id, runId);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  cancelRun(id, runId);
  return NextResponse.json({ ok: true });
}
