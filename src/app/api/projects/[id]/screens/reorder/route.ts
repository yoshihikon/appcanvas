import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/repositories/projects";
import { reorderScreens } from "@/lib/db/repositories/screens";

type RouteContext = { params: Promise<{ id: string }> };

/** 画面の並び順・グループを一括更新する */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const raw: unknown = body?.items;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }
  const items: { id: string; groupName: string; sortOrder: number }[] = [];
  for (const it of raw) {
    if (
      it &&
      typeof it.id === "string" &&
      typeof it.groupName === "string" &&
      typeof it.sortOrder === "number"
    ) {
      items.push({ id: it.id, groupName: it.groupName, sortOrder: it.sortOrder });
    }
  }

  reorderScreens(id, items);
  return NextResponse.json({ ok: true });
}
