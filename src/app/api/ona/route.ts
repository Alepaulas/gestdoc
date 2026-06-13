import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const nivel = parseInt(new URL(req.url).searchParams.get("nivel") ?? "1");

  const itens = await prisma.itemONA.findMany({
    where:{ nivel:{ lte:nivel } },
    include:{ documentos:{ include:{ documento:{ select:{ id:true, codigo:true, titulo:true, status:true } } } } },
    orderBy:{ codigo:"asc" },
  });

  const resultado = itens.map(item => {
    const docs = item.documentos.map(d => d.documento);
    const vigentes = docs.filter(d => d.status === "VIGENTE");
    const status = docs.length === 0 ? "gap" : vigentes.length > 0 ? "ok" : "warn";
    return { ...item, docs, status };
  });

  const grouped: Record<string, typeof resultado> = {};
  resultado.forEach(i => {
    if (!grouped[i.secao]) grouped[i.secao] = [];
    grouped[i.secao].push(i);
  });

  const secoes = Object.entries(grouped).map(([secao, itens]) => {
    const ok = itens.filter(i=>i.status==="ok").length;
    const warn = itens.filter(i=>i.status==="warn").length;
    const gap = itens.filter(i=>i.status==="gap").length;
    const pct = itens.length > 0 ? Math.round(((ok+warn*0.5)/itens.length)*100) : 0;
    return { secao, itens, ok, warn, gap, pct };
  });

  const totalOk = resultado.filter(i=>i.status==="ok").length;
  const totalWarn = resultado.filter(i=>i.status==="warn").length;
  const totalGap = resultado.filter(i=>i.status==="gap").length;
  const conformidade = resultado.length > 0 ? Math.round(((totalOk+totalWarn*0.5)/resultado.length)*100) : 0;

  return NextResponse.json({ secoes, conformidade, totalOk, totalWarn, totalGap, totalItens:resultado.length });
}
