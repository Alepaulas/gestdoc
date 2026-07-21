import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token não encontrado" }, { status: 401 });
  const docs = await lerPlanilha(accessToken, refreshToken);
  const vencidos = docs.filter(d => d.status === "VENCIDO").length;
  const vencendo = docs.filter(d => d.status === "VENCENDO").length;
  return NextResponse.json({ processados: docs.length, vencidos, vencendo });
}
