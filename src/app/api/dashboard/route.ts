import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await Promise.all([
    queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE status!='OBSOLETO'"),
    queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE status='VIGENTE'"),
    queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE status='VENCENDO'"),
    queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE status='VENCIDO'"),
    queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE status='EM_REVISAO'"),
    queryOne<any>("SELECT COUNT(*) as c FROM LeituraConfirmada WHERE confirmadaEm IS NULL"),
    queryOne<any>("SELECT COUNT(*) as c FROM EtapaAprovacao WHERE status='PENDENTE'"),
  ]);

  const alertas = await query<any>(`
    SELECT d.id,d.codigo,d.titulo,d.status,d.dataRevisao,
           u.nome as unidade,s.nome as setor,a.nome as area,us.name as responsavelNome
    FROM Documento d
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    JOIN User us ON d.responsavelId=us.id
    WHERE d.status IN ('VENCENDO','VENCIDO') ORDER BY d.dataRevisao ASC LIMIT 10`);

  const porCategoria = await query<any>(`
    SELECT c.id,c.nome,c.sigla,c.cor,COUNT(d.id) as total
    FROM Categoria c LEFT JOIN Documento d ON c.id=d.categoriaId AND d.status!='OBSOLETO'
    GROUP BY c.id ORDER BY total DESC`);

  const ultimosAdicionados = await query<any>(`
    SELECT d.id,d.codigo,d.titulo,d.createdAt,c.sigla,c.cor,u.nome as unidade
    FROM Documento d JOIN Categoria c ON d.categoriaId=c.id
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    ORDER BY d.createdAt DESC LIMIT 5`);

  return NextResponse.json({
    total: stats[0]?.c??0, vigentes: stats[1]?.c??0, vencendo: stats[2]?.c??0,
    vencidos: stats[3]?.c??0, emRevisao: stats[4]?.c??0,
    revisoesPendentes: (stats[2]?.c??0)+(stats[3]?.c??0),
    leiturasNaoConfirmadas: stats[5]?.c??0, aprovacoesPendentes: stats[6]?.c??0,
    alertas, porCategoria, ultimosAdicionados,
  });
}
