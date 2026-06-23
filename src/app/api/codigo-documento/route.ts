import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gerarCodigo } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo")?.toUpperCase();
  const area = searchParams.get("area")?.toUpperCase();

  if (!tipo || !area) return NextResponse.json({ error: "Informe tipo e area." }, { status: 400 });

  const token = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!token) return NextResponse.json({ error: "Token Google não encontrado." }, { status: 400 });

  try {
    const codigo = await gerarCodigo(token, refreshToken, tipo, area);
    return NextResponse.json({ codigo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
