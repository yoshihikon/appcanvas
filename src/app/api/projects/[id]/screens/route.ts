import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { createScreen, listScreens } from "@/lib/db/repositories/screens";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ screens: listScreens(id) });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "画面名を入力してください" },
      { status: 400 },
    );
  }
  const screen = createScreen(id, {
    name,
    description:
      typeof body?.description === "string" ? body.description : undefined,
    groupName: typeof body?.groupName === "string" ? body.groupName : undefined,
    device: typeof body?.device === "string" ? body.device : undefined,
  });
  return NextResponse.json({ screen }, { status: 201 });
}
