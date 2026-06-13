import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { listScreens } from "@/lib/db/repositories/screens";
import { createRun } from "@/lib/db/repositories/generation";
import { startCodeGeneration } from "@/lib/generation/orchestrator";

type RouteContext = { params: Promise<{ id: string }> };

/** 開発コード生成ランを作成し、生成を開始する（プロジェクト全画面が対象） */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const generated = listScreens(id).filter((s) => s.status === "generated");
  if (generated.length === 0) {
    return NextResponse.json(
      { error: "生成済みの画面がありません。先に画面を生成してください。" },
      { status: 400 },
    );
  }

  const run = createRun(id, {
    input: "",
    defaultDevice: "desktop",
    kind: "code",
    status: "generating",
  });
  startCodeGeneration(id, run.id);
  return NextResponse.json({ runId: run.id }, { status: 201 });
}
