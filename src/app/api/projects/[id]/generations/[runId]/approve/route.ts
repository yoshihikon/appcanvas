import { NextResponse } from "next/server";
import { getRun } from "@/lib/db/repositories/generation";
import { approveRun, isActive } from "@/lib/generation/orchestrator";
import type { Proposal } from "@/lib/generation/types";

type RouteContext = { params: Promise<{ id: string; runId: string }> };

/** 構成案を確定し、順次生成(GENERATING)を開始する */
export async function POST(request: Request, { params }: RouteContext) {
  const { id, runId } = await params;
  const run = getRun(id, runId);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (isActive(runId)) {
    return NextResponse.json({ error: "処理中です" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const proposal = body?.proposal as Proposal | undefined;
  if (!proposal || !Array.isArray(proposal.screens)) {
    return NextResponse.json({ error: "invalid proposal" }, { status: 400 });
  }
  if (!proposal.screens.some((s) => s.include)) {
    return NextResponse.json(
      { error: "生成する画面を1つ以上選択してください" },
      { status: 400 },
    );
  }

  approveRun(id, runId, proposal);
  return NextResponse.json({ ok: true });
}
