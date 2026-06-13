import { NextResponse } from "next/server";
import {
  deleteScreen,
  getScreen,
  updateScreen,
} from "@/lib/db/repositories/screens";

type RouteContext = { params: Promise<{ id: string; screenId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id, screenId } = await params;
  const screen = getScreen(id, screenId);
  if (!screen) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ screen });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, screenId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const patch: Parameters<typeof updateScreen>[2] = {};
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.groupName === "string") patch.groupName = body.groupName;
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;

  const screen = updateScreen(id, screenId, patch);
  if (!screen) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ screen });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, screenId } = await params;
  deleteScreen(id, screenId);
  return NextResponse.json({ ok: true });
}
