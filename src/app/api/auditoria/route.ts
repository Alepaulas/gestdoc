import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false });

  const { acao, modulo, detalhe } = await req.json();

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ ok: false });

  await registrarAuditoria(accessToken, refreshToken, {
    usuario: session.user?.name ?? "Desconhecido",
    email:   session.user?.email ?? "",
    acao, modulo, detalhe,
  });

  return NextResponse.json({ ok: true });
}
