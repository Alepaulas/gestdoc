import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const nivel = parseInt(new URL(req.url).searchParams.get("nivel") || "1");

  const itens = await query<any>("SELECT * FROM ItemONA WHERE nivel<=? ORDER BY codigo", [nivel]);

  const resultado = await Promise.all(itens.map(async (item: any) => {
    const docs = await query<any>(`
      SELECT d.id,d.codigo,d.titulo,d.status,d.dataRevisao
      FROM Documento d JOIN DocumentoItemONA doi ON d.id=doi.documentoId
      WHERE doi.itemONAId=? AND d.status!='OBSOLETO'`, [item.id]);

    let status = "gap";
    if (docs.length > 0) {
      const vigentes = docs.filter((d: any) => d.status === "VIGENTE");
      if (vigentes.length > 0) status = "ok";
      else status = "warn";
    }
    return { ...item, docs, status };
  }));

  // Group by secao
  const grouped: Record<string, any[]> = {};
  resultado.forEach(item => {
    if (!grouped[item.secao]) grouped[item.secao] = [];
    grouped[item.secao].push(item);
  });

  const secoes = Object.entries(grouped).map(([secao, itens]) => {
    const ok = itens.filter(i => i.status === "ok").length;
    const warn = itens.filter(i => i.status === "warn").length;
    const gap = itens.filter(i => i.status === "gap").length;
    const pct = itens.length > 0 ? Math.round(((ok + warn * 0.5) / itens.length) * 100) : 0;
    return { secao, itens, ok, warn, gap, pct };
  });

  const totalItens = resultado.length;
  const totalOk = resultado.filter(i => i.status === "ok").length;
  const totalWarn = resultado.filter(i => i.status === "warn").length;
  const totalGap = resultado.filter(i => i.status === "gap").length;
  const conformidade = totalItens > 0 ? Math.round(((totalOk + totalWarn * 0.5) / totalItens) * 100) : 0;

  return NextResponse.json({ secoes, conformidade, totalOk, totalWarn, totalGap, totalItens });
}
