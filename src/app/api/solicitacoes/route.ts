import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive";

async function gerarCodigo(): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.solicitacao.count({
    where: { codigo: { startsWith: `SOL-${ano}-` } },
  });
  return `SOL-${ano}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const papel  = (session.user as any).papelFluxo as string | null;
  const role   = (session.user as any).role as string;
  const user   = await prisma.user.findUnique({ where: { id: userId } });

  const { searchParams } = new URL(req.url);
  const filtro = searchParams.get("filtro") ?? "fila";

  // Etapas por papel
  const etapasPorPapel: Record<string, string[]> = {
    UNIDADE:            ["DEVOLVIDA_UNIDADE", "DEVOLVIDA_NUGESP", "AGUARDANDO_VALIDACAO_UNIDADE"],
    REFERENCIA_TECNICA: ["ABERTA", "EM_ANALISE_RT"],
    NUGESP:             ["EM_ANALISE_NUGESP"],
    GESTDOC:            ["EM_PADRONIZACAO", "AGUARDANDO_PUBLICACAO"],
  };

  let where: any = {};
  if (filtro === "fila" && papel && papel !== "ADMIN") {
    where.etapaAtual = { in: etapasPorPapel[papel] ?? [] };
    if (papel === "UNIDADE") where.unidadeId = user?.unidadeId ?? "___none___";
  } else if (filtro === "minhas") {
    where.solicitanteId = userId;
  }
  // "todas" → sem filtro (só admin/gestdoc vê tudo)

  const solicitacoes = await prisma.solicitacao.findMany({
    where,
    include: {
      unidade: { select: { nome: true, sigla: true } },
      solicitante: { select: { name: true, email: true } },
      _count: { select: { anexos: true } },
      etapas: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(solicitacoes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const papel  = (session.user as any).papelFluxo as string | null;

  if (papel !== "UNIDADE") {
    return NextResponse.json({ error: "Apenas usuários com papel UNIDADE podem abrir solicitações." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const formData = await req.formData();

  const titulo          = (formData.get("titulo") as string)?.trim();
  const descricao       = (formData.get("descricao") as string)?.trim();
  const tipoRequisicao  = (formData.get("tipoRequisicao") as string) ?? "Elaboração";
  const abrangencia     = (formData.get("abrangencia") as string) ?? "Institucional";
  const tipoDocumento   = (formData.get("tipoDocumento") as string) ?? "";
  const setorSigla      = (formData.get("setorSigla") as string) ?? "";
  const numeroDocumento = (formData.get("numeroDocumento") as string) ?? "";
  const codigoDocumento = (formData.get("codigoDocumento") as string) ?? "";
  const arquivos        = formData.getAll("arquivos") as File[];

  // Validações
  const erros: string[] = [];
  if (!titulo)         erros.push("Título é obrigatório.");
  if (!tipoDocumento)  erros.push("Tipo de Documento é obrigatório.");
  if (!setorSigla)     erros.push("Setor é obrigatório.");
  if (!abrangencia)    erros.push("Abrangência é obrigatória.");
  if (tipoRequisicao === "Revisão" && !numeroDocumento) erros.push("Número do Documento é obrigatório para revisões.");
  if (tipoRequisicao === "Revisão" && !codigoDocumento) erros.push("Código do Documento é obrigatório para revisões.");
  if (arquivos.length === 0) erros.push("Anexe ao menos um documento.");

  if (erros.length > 0) return NextResponse.json({ error: erros.join(" | ") }, { status: 400 });

  const codigo = await gerarCodigo();

  try {
    const solicitacao = await prisma.solicitacao.create({
      data: {
        codigo,
        titulo,
        descricao: descricao || null,
        tipoRequisicao,
        abrangencia,
        tipoDocumento,
        setorSigla,
        numeroDocumento: numeroDocumento || null,
        codigoDocumento: codigoDocumento || null,
        etapaAtual: "ABERTA",
        unidadeId: user?.unidadeId ?? null,
        solicitanteId: userId,
        etapas: {
          create: {
            etapa: "ABERTA",
            acao: "ABERTURA",
            comentario: `Solicitação de ${tipoRequisicao} aberta pela unidade.`,
            responsavelId: userId,
          },
        },
      },
    });

    for (const file of arquivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToDrive(userId, file.name, file.type || "application/octet-stream", buffer);
      await prisma.solicitacaoAnexo.create({
        data: {
          solicitacaoId: solicitacao.id,
          nome: uploaded.fileName,
          url: uploaded.fileUrl,
          enviadoPorId: userId,
          etapa: "ABERTA",
        },
      });
    }

    return NextResponse.json({ success: true, id: solicitacao.id, codigo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
