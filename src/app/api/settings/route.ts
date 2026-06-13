import { NextResponse } from "next/server";
import { isModelChoice } from "@/lib/agent/models";
import { readSettings, updateSettings } from "@/lib/storage/settings";

export async function GET() {
  return NextResponse.json({ settings: readSettings() });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.model !== undefined && !isModelChoice(body.model)) {
    return NextResponse.json(
      { error: "未対応のモデルです" },
      { status: 400 },
    );
  }
  const settings = updateSettings({ model: body?.model });
  return NextResponse.json({ settings });
}
