import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { listWorkspaceTree } from "@/lib/workspace/files";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ tree: listWorkspaceTree(id) });
}
