import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const role = (session.user as any).role as string;
  const papel = (session.user as any).papelFluxo as string;

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ notificacoes: [], total: 0 });

  try {
    const docs = await lerPlanilha(accessToken, refreshToken);
    const hoje = new Date();

    // Calcula dias restantes e filtra vencidos + vencendo (até 60 dias)
    const alertas = docs
      .map(d => {
        let diasVencimento: number | null = null;
        if (d.dataRevisao) {
          const partes = d.dataRevisao.split("/");
          if (partes.length === 3) {
            const rev = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
            diasVencimento = Math.ceil((rev.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        return { ...d, diasVencimento };
      })
      .filter(d => d.diasVencimento !== null && d.diasVencimento <= 60)
      .sort((a, b) => (a.diasVencimento ?? 0) - (b.diasVencimento ?? 0))
      .slice(0, 30);

    const notificacoes = alertas.map(d => ({
      codigo: d.codigo,
      titulo: d.titulo,
      diasVencimento: d.diasVencimento,
      dataProximaRevisao: d.dataRevisao,
      unidade: d.unidade,
      status: d.status,
    }));

    return NextResponse.json({ notificacoes, total: notificacoes.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ notificacoes: [], total: 0 });
  }
}
