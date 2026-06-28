import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const papel = (session.user as any).papelFluxo as string;
  const role  = (session.user as any).role as string;

  // Só UNIDADE, ADMIN e GESTDOC recebem notificações de vencimento
  const papeisPermitidos = ["UNIDADE", "ADMIN", "GESTDOC"];
  if (!papeisPermitidos.includes(papel) && role !== "ADMIN") {
    return NextResponse.json({ notificacoes: [], total: 0 });
  }

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ notificacoes: [], total: 0 });

  try {
    const docs = await lerPlanilha(accessToken, refreshToken);
    const unidade = (session.user as any).unidade as string ?? "";

    // Filtra documentos vencendo (≤60 dias) ou vencidos
    let alertas = docs.filter(d =>
      d.diasVencimento !== null && d.diasVencimento <= 60
    );

    // UNIDADE só vê os da sua unidade
    if (papel === "UNIDADE" && unidade) {
      alertas = alertas.filter(d =>
        d.unidade?.toUpperCase() === unidade.toUpperCase()
      );
    }

    const notificacoes = alertas
      .sort((a, b) => (a.diasVencimento ?? 0) - (b.diasVencimento ?? 0))
      .slice(0, 20) // máximo 20
      .map(d => ({
        codigo:            d.codigo,
        titulo:            d.titulo,
        diasVencimento:    d.diasVencimento,
        dataProximaRevisao: d.dataProximaRevisao,
        unidade:           d.unidade,
        status:            d.statusValidade,
      }));

    return NextResponse.json({ notificacoes, total: notificacoes.length });
  } catch {
    return NextResponse.json({ notificacoes: [], total: 0 });
  }
}
