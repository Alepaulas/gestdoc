import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";
import { gerarDocxSemTemplate } from "@/lib/docx";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docId = new URL(req.url).searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const doc = await queryOne<any>(`
    SELECT d.*,c.nome as catNome,c.sigla,a.nome as area,s.nome as setor,u.nome as unidade,
           us.name as responsavelNome,us.email as responsavelEmail
    FROM Documento d JOIN Categoria c ON d.categoriaId=c.id
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    JOIN User us ON d.responsavelId=us.id WHERE d.id=?`, [docId]);

  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const itensONA = await query<any>(`SELECT oi.codigo,oi.titulo FROM ItemONA oi JOIN DocumentoItemONA doi ON oi.id=doi.itemONAId WHERE doi.documentoId=?`, [docId]);

  const buffer = await gerarDocxSemTemplate({
    codigo: doc.codigo, titulo: doc.titulo, versao: doc.versao,
    categoria: doc.catNome, siglaCategoria: doc.sigla,
    unidade: doc.unidade, setor: doc.setor, area: doc.area,
    responsavel: doc.responsavelNome, emailResponsavel: doc.responsavelEmail||"",
    dataEmissao: formatDate(doc.dataEmissao), dataRevisao: formatDate(doc.dataRevisao),
    descricao: doc.descricao||"",
    itensONA: itensONA.map((i: any) => `${i.codigo} — ${i.titulo}`).join("\n"),
    ano: new Date().getFullYear().toString(),
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${doc.codigo}_v${doc.versao}.docx"`,
    },
  });
}
