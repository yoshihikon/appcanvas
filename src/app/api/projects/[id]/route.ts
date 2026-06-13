import { NextResponse } from "next/server";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/lib/db/repositories/projects";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const patch: {
    name?: string;
    persona?: string;
    overview?: string;
    skills?: string[];
    designSystem?: string;
    defaultDevice?: string;
  } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "プロジェクト名を入力してください" },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (typeof body.persona === "string") patch.persona = body.persona;
  if (typeof body.overview === "string") patch.overview = body.overview;
  if (Array.isArray(body.skills)) patch.skills = body.skills;
  if (typeof body.designSystem === "string") patch.designSystem = body.designSystem;
  if (body.defaultDevice === "desktop" || body.defaultDevice === "mobile") {
    patch.defaultDevice = body.defaultDevice;
  }

  const project = updateProject(id, patch);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  deleteProject(id);
  return NextResponse.json({ ok: true });
}
