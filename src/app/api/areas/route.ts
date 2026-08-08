import { NextResponse } from "next/server";
import { API_VERSION, listAreaSummaries } from "@/lib/api-payload";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ apiVersion: API_VERSION, areas: listAreaSummaries() });
}
