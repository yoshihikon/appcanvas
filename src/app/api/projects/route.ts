import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db/repositories/projects";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "プロジェクト名を入力してください" },
      { status: 400 },
    );
  }
  const project = createProject({
    name,
    persona: typeof body?.persona === "string" ? body.persona : undefined,
    overview: typeof body?.overview === "string" ? body.overview : undefined,
  });
  return NextResponse.json({ project }, { status: 201 });
}
