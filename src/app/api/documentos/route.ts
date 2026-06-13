import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { gerarId, formatDate, calcStatus } from "@/lib/utils";
import { sendEmail, htmlAprovacao } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status"); const search = sp.get("search");
  const cat = sp.get("categoriaId"); const page = parseInt(sp.get("page")||"1");
  const limit = 20; const offset = (page-1)*limit;

  let where = "WHERE d.status!='OBSOLETO'";
  const params: any[] = [];
  if (status) { where += " AND d.status=?"; params.push(status); }
  if (cat) { where += " AND d.categoriaId=?"; params.push(cat); }
  if (search) { where += " AND (d.titulo LIKE ? OR d.codigo LIKE ?)"; params.push(`%${search}%`,`%${search}%`); }

  const documentos = await query<any>(`
    SELECT d.*,c.nome as catNome,c.sigla,c.cor,
           a.nome as area,s.nome as setor,u.nome as unidade,
           us.name as responsavelNome,us.email as responsavelEmail,us.image as responsavelImg
    FROM Documento d
    JOIN Categoria c ON d.categoriaId=c.id
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    JOIN User us ON d.responsavelId=us.id
    ${where} ORDER BY d.dataRevisao ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);

  const total = (await queryOne<any>(`SELECT COUNT(*) as c FROM Documento d ${where}`, params))?.c ?? 0;
  return NextResponse.json({ documentos, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { titulo,categoriaId,areaId,responsavelId,versao,dataEmissao,dataRevisao,descricao,driveFileId,driveFileUrl,driveFileName,itensONA } = body;

  const cat = await queryOne<any>("SELECT * FROM Categoria WHERE id=?", [categoriaId]);
  const count = (await queryOne<any>("SELECT COUNT(*) as c FROM Documento WHERE categoriaId=?", [categoriaId]))?.c ?? 0;
  const codigo = `${cat?.sigla??'DOC'}-${String(count+1).padStart(3,"0")}`;
  const id = gerarId();
  const status = calcStatus(dataRevisao, "VIGENTE");

  await execute(`INSERT INTO Documento(id,codigo,titulo,versao,status,dataEmissao,dataRevisao,descricao,categoriaId,areaId,responsavelId,driveFileId,driveFileUrl,driveFileName) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,codigo,titulo,versao||"1.0",status,dataEmissao,dataRevisao,descricao||null,categoriaId,areaId,responsavelId,driveFileId||null,driveFileUrl||null,driveFileName||null]);

  if (itensONA?.length) {
    for (const itemId of itensONA) {
      await execute("INSERT OR IGNORE INTO DocumentoItemONA(documentoId,itemONAId) VALUES(?,?)", [id, itemId]);
    }
  }

  await execute("INSERT INTO AuditLog(id,acao,descricao,documentoId,userId) VALUES(?,?,?,?,?)",
    [gerarId(),"CRIACAO",`Documento ${codigo} criado`,id,(session.user as any).id]);

  const doc = await queryOne<any>(`
    SELECT d.*,c.nome as catNome,c.sigla,c.cor,a.nome as area,s.nome as setor,u.nome as unidade,us.name as responsavelNome
    FROM Documento d JOIN Categoria c ON d.categoriaId=c.id
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    JOIN User us ON d.responsavelId=us.id WHERE d.id=?`, [id]);

  return NextResponse.json(doc, { status: 201 });
}
