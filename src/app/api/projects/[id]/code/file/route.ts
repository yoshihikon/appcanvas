import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { readWorkspaceFile } from "@/lib/workspace/files";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const relPath = new URL(request.url).searchParams.get("path");
  if (!relPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  const result = readWorkspaceFile(id, relPath);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ path: result.path, content: result.content });
}
