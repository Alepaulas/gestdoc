import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token não encontrado" }, { status: 401 });
  const docs = await lerPlanilha(accessToken, refreshToken);
  return NextResponse.json({
    total:    docs.length,
    vigentes: docs.filter(d => d.status === "VIGENTE").length,
    vencendo: docs.filter(d => d.status === "VENCENDO").length,
    vencidos: docs.filter(d => d.status === "VENCIDO").length,
  });
}
