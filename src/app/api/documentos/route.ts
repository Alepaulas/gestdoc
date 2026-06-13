import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const search = sp.get("search") ?? "";
  const status = sp.get("status") ?? "";
  const tipo = sp.get("categoriaId") ?? "";
  const page = parseInt(sp.get("page") ?? "1");
  const limit = 20;

  const where: any = { status:{ not:"OBSOLETO" } };
  if (search) where.OR = [{ titulo:{ contains:search } }, { codigo:{ contains:search } }];
  if (status) where.status = status;
  if (tipo) where.tipoId = tipo;

  const [documentos, total] = await Promise.all([
    prisma.documento.findMany({
      where, include:{
        tipo:true,
        area:{ include:{ setor:{ include:{ unidade:true } } } },
        responsavel:{ select:{ id:true, name:true, email:true, image:true } },
      },
      orderBy:{ proximaRevisao:"asc" },
      skip:(page-1)*limit, take:limit,
    }),
    prisma.documento.count({ where }),
  ]);

  return NextResponse.json({
    documentos: documentos.map(d => ({
      ...d,
      catNome: d.tipo.nome, sigla: d.tipo.sigla, cor: d.tipo.cor,
      area: d.area.nome, setor: d.area.setor.nome, unidade: d.area.setor.unidade.nome,
      responsavelNome: d.responsavel.name, responsavelEmail: d.responsavel.email,
    })),
    total, page, limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { titulo, tipoId, areaId, responsavelId, versao, dataPadronizacao, dataRevisao, proximaRevisao, descricao, observacao, linkEditavel, linkPdf, itensONA } = body;

  // Gera código: AAA.XXX.000
  const tipo = await prisma.tipoDocumento.findUnique({ where:{ id:tipoId } });
  const area = await prisma.area.findUnique({ where:{ id:areaId }, include:{ setor:{ include:{ unidade:true } } } });
  const count = await prisma.documento.count({ where:{ tipoId, areaId } });
  const codigo = `${tipo?.sigla}.${area?.sigla}.${String(count+1).padStart(3,"0")}`;

  // Calculates automatic status
  const agora = new Date();
  const rev = new Date(proximaRevisao ?? dataRevisao);
  const diff = Math.ceil((rev.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
  const status = diff < 0 ? "VENCIDO" : diff <= 30 ? "VENCENDO" : "VIGENTE";

  const doc = await prisma.documento.create({
    data:{
      titulo, codigo, tipoId, areaId, responsavelId,
      versao: versao ?? "00",
      status,
      dataPadronizacao: new Date(dataPadronizacao),
      dataRevisao: new Date(dataRevisao),
      proximaRevisao: new Date(proximaRevisao ?? dataRevisao),
      descricao, observacao, linkEditavel, linkPdf,
      itensONA: itensONA?.length ? { create: itensONA.map((id:string) => ({ itemONAId:id })) } : undefined,
    },
    include:{ tipo:true, area:{ include:{ setor:{ include:{ unidade:true } } } }, responsavel:true },
  });

  // Audit
  const userId = (session.user as any).id;
  if (userId) {
    await prisma.auditLog.create({ data:{ acao:"CRIACAO", descricao:`Documento ${codigo} criado`, documentoId:doc.id, userId } });
  }

  return NextResponse.json(doc, { status:201 });
}
