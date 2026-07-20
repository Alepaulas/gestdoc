import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerSolicitacoesEmail, atualizarSolicitacaoEmail } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  try {
    const itens = await lerSolicitacoesEmail(accessToken, refreshToken);
    return NextResponse.json({ itens, total: itens.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado" }, { status: 401 });

  const body = await req.json();
  const linha = Number(body.linha);
  if (!linha || linha < 2) return NextResponse.json({ error: "Linha inválida" }, { status: 400 });

  try {
    await atualizarSolicitacaoEmail(accessToken, refreshToken, linha, {
      status:            body.status,
      responsavel:       body.responsavel,
      dataValidacao:     body.dataValidacao,
      dataPadronizacao:  body.dataPadronizacao,
      dataPublicacao:    body.dataPublicacao,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
