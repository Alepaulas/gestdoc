import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sincronizarTudoNoSheets, aplicarFormatacaoStatus } from "@/lib/sheets";

// GET — status da planilha
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    spreadsheetId: "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo",
    url: "https://docs.google.com/spreadsheets/d/1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo/edit",
  });
}

// POST — sincroniza todos os documentos com a planilha
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pega o token do usuário logado via JWT
  const token = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;

  // Se não tiver token na sessão (JWT mode), usa token do env
  // Em produção com Google OAuth o token vem na sessão
  if (!token) {
    return NextResponse.json({
      error: "Token Google não encontrado na sessão. Configure o Google OAuth com escopo spreadsheets.",
      hint: "Adicione 'https://www.googleapis.com/auth/spreadsheets' no scope do Google Provider"
    }, { status: 400 });
  }

  const documentos = await prisma.documento.findMany({
    include: {
      tipo: true,
      area: { include: { setor: { include: { unidade: true } } } },
      responsavel: { select: { name: true, email: true } },
      itensONA: { include: { itemONA: true } },
    },
    orderBy: { codigo: "asc" },
  });

  await sincronizarTudoNoSheets(token, refreshToken, documentos);
  await aplicarFormatacaoStatus(token, refreshToken);

  return NextResponse.json({ success: true, sincronizados: documentos.length });
}
