import { NextResponse } from "next/server";
import { checkAgentHealth } from "@/lib/agent/health";

export async function GET() {
  return NextResponse.json(await checkAgentHealth());
}
