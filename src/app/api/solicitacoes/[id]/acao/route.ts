import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive";
import { aplicarTransicao, type Acao, type Etapa, type PapelFluxo } from "@/lib/solicitacaoFlow";
import { gerarCodigo, adicionarNaPlanilha } from "@/lib/sheets";
import { REGRAS_FORMATACAO } from "@/lib/normaZero";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { unidade: { select: { nome: true, sigla: true } } },
  });

  if (!user?.papelFluxo) {
    return NextResponse.json({ error: "Seu usuário não tem papel definido no fluxo." }, { status: 403 });
  }

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      unidade: { select: { nome: true, sigla: true } },
      solicitante: { select: { name: true, email: true } },
      anexos: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!solicitacao) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });

  if (user.papelFluxo === "UNIDADE" && user.unidadeId !== solicitacao.unidadeId) {
    return NextResponse.json({ error: "Você só pode agir em solicitações da sua própria unidade." }, { status: 403 });
  }

  const formData = await req.formData();
  const acao = formData.get("acao") as Acao;
  const comentario = (formData.get("comentario") as string) ?? "";
  const arquivos = formData.getAll("arquivos") as File[];

  // Campos extras para quando RT valida (gera código)
  const tipoDocumento = (formData.get("tipoDocumento") as string) ?? "";
  const areaDocumento = (formData.get("areaDocumento") as string) ?? "";
  const elaborador    = (formData.get("elaborador") as string) ?? "";
  const aprovador     = (formData.get("aprovador") as string) ?? "";
  const versao        = (formData.get("versao") as string) ?? "00";
  const criticidade   = (formData.get("criticidade") as string) ?? "";
  const linkPublicado = (formData.get("linkPublicado") as string) ?? "";

  // Validações específicas por ação
  if (acao === "VALIDOU" && user.papelFluxo === "REFERENCIA_TECNICA") {
    if (!tipoDocumento || !areaDocumento) {
      return NextResponse.json({ error: "Informe o Tipo e a Área do documento para validar." }, { status: 400 });
    }
  }
  if ((acao === "REENVIO" || acao === "PADRONIZOU") && arquivos.length === 0) {
    return NextResponse.json({ error: "Anexe ao menos um documento para esta ação." }, { status: 400 });
  }
  if (acao === "PUBLICOU" && !solicitacao.codigoGerado) {
    return NextResponse.json({ error: "Código do documento não foi gerado. Verifique se a RT validou corretamente." }, { status: 400 });
  }

  let novaEtapa: Etapa;
  try {
    novaEtapa = aplicarTransicao(solicitacao.etapaAtual as Etapa, acao, user.papelFluxo as PapelFluxo);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // Gera código quando RT valida (VALIDOU → EM_PADRONIZACAO)
  let codigoGerado = solicitacao.codigoGerado;
  if (acao === "VALIDOU" && user.papelFluxo === "REFERENCIA_TECNICA" && !codigoGerado) {
    const accessToken  = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    if (accessToken) {
      try {
        codigoGerado = await gerarCodigo(accessToken, refreshToken, tipoDocumento, areaDocumento);
      } catch {
        codigoGerado = `${tipoDocumento}.${areaDocumento}.---`;
      }
    }
  }

  try {
    // Atualiza solicitação e cria etapa em transação
    const updateData: any = { etapaAtual: novaEtapa };
    if (acao === "VALIDOU" && user.papelFluxo === "REFERENCIA_TECNICA") {
      updateData.tipoDocumento = tipoDocumento;
      updateData.areaDocumento = areaDocumento;
      updateData.codigoGerado  = codigoGerado;
      updateData.elaborador    = elaborador || null;
      updateData.aprovador     = aprovador  || null;
      updateData.versao        = versao     || "00";
      updateData.criticidade   = criticidade || null;
    }
    if (acao === "PUBLICOU" && linkPublicado) {
      updateData.linkPublicado = linkPublicado;
    }

    await prisma.$transaction(async (tx) => {
      await tx.solicitacao.update({ where: { id }, data: updateData });
      await tx.solicitacaoEtapa.create({
        data: {
          solicitacaoId: id,
          etapa: novaEtapa,
          acao,
          comentario: comentario.trim() || null,
          responsavelId: user.id,
        },
      });
    });

    // Upload de anexos
    for (const file of arquivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToDrive(user.id, file.name, file.type || "application/octet-stream", buffer);
      await prisma.solicitacaoAnexo.create({
        data: {
          solicitacaoId: id,
          nome: uploaded.fileName,
          url: uploaded.fileUrl,
          enviadoPorId: user.id,
          etapa: novaEtapa,
        },
      });
    }

    // PUBLICAÇÃO → grava na Lista Mestra do Sheets
    if (acao === "PUBLICOU") {
      const accessToken  = (session as any).accessToken;
      const refreshToken = (session as any).refreshToken;
      if (accessToken && codigoGerado) {
        const tipoSigla = solicitacao.tipoDocumento ?? "";
        const tipoNome  = REGRAS_FORMATACAO[tipoSigla as keyof typeof REGRAS_FORMATACAO]?.nome ?? tipoSigla;
        const hoje      = new Date().toLocaleDateString("pt-BR");
        const ultimoAnexo = solicitacao.anexos[0];

        try {
          await adicionarNaPlanilha(accessToken, refreshToken, {
            nome:             solicitacao.solicitante.name ?? solicitacao.solicitante.email ?? "",
            titulo:           solicitacao.titulo,
            linkEditavel:     linkPublicado || ultimoAnexo?.url || "",
            codigo:           codigoGerado,
            tipo:             tipoNome ? `${tipoSigla} — ${tipoNome}` : tipoSigla,
            localizacao:      solicitacao.unidade.nome,
            unidade:          solicitacao.unidade.sigla,
            area:             solicitacao.areaDocumento ?? "",
            status:           "VIGENTE",
            observacao:       "",
            dataPadronizacao: hoje,
            dataRevisao:      hoje,
            itensONA:         [],
            versao:           solicitacao.versao ?? "00",
            elaborador:       solicitacao.elaborador ?? "",
            aprovador:        solicitacao.aprovador  ?? "",
            criticidade:      solicitacao.criticidade ?? "",
          });
        } catch (sheetsErr: any) {
          // Não falha a publicação por erro no Sheets — registra mas segue
          console.error("Erro ao gravar na Lista Mestra:", sheetsErr.message);
        }
      }
    }

    return NextResponse.json({ success: true, novaEtapa, codigoGerado });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao processar ação." }, { status: 500 });
  }
}
