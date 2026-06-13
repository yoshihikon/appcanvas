import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { createRun } from "@/lib/db/repositories/generation";
import { startProposing } from "@/lib/generation/orchestrator";
import { isDeviceType } from "@/lib/device";

type RouteContext = { params: Promise<{ id: string }> };

/** 生成ランを作成し、構成案の検討(PROPOSING)を開始する */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input : "";
  const defaultDevice = isDeviceType(body?.defaultDevice)
    ? body.defaultDevice
    : project.defaultDevice;

  const run = createRun(id, { input, defaultDevice });
  startProposing(id, run.id);
  return NextResponse.json({ runId: run.id }, { status: 201 });
}
