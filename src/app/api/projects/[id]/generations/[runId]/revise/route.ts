import { NextResponse } from "next/server";
import { getRun } from "@/lib/db/repositories/generation";
import { isActive, reviseRun } from "@/lib/generation/orchestrator";
import type { Proposal } from "@/lib/generation/types";

type RouteContext = { params: Promise<{ id: string; runId: string }> };

/** レビューでの自由文指示＋編集済み案を渡して再検討する */
export async function POST(request: Request, { params }: RouteContext) {
  const { id, runId } = await params;
  const run = getRun(id, runId);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (isActive(runId)) {
    return NextResponse.json({ error: "処理中です" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const instruction = typeof body?.instruction === "string" ? body.instruction : "";
  const proposal = body?.proposal as Proposal | undefined;
  if (!proposal || !Array.isArray(proposal.screens)) {
    return NextResponse.json({ error: "invalid proposal" }, { status: 400 });
  }

  reviseRun(id, runId, instruction, proposal);
  return NextResponse.json({ ok: true });
}
