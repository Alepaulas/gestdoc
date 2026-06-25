import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive";
import { aplicarTransicao, type Acao, type Etapa, type PapelFluxo } from "@/lib/solicitacaoFlow";
import { gerarCodigo, adicionarNaPlanilha, ensureHeaders } from "@/lib/sheets";
import { REGRAS_FORMATACAO } from "@/lib/normaZero";
import { SETORES } from "@/lib/setores";
import { UNIDADES } from "@/lib/unidades";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const papel  = (session.user as any).papelFluxo as string | null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { unidade: true },
  });

  if (!papel) return NextResponse.json({ error: "Papel não definido. Contate o administrador." }, { status: 403 });

  const sol = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      unidade: true,
      solicitante: { select: { name: true, email: true } },
      anexos: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!sol) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });

  // Unidade só pode agir nas suas próprias solicitações
  if (papel === "UNIDADE" && user?.unidadeId && sol.unidadeId && user.unidadeId !== sol.unidadeId) {
    return NextResponse.json({ error: "Você só pode agir em solicitações da sua unidade." }, { status: 403 });
  }

  const formData = await req.formData();
  const acao        = formData.get("acao") as Acao;
  const comentario  = (formData.get("comentario") as string) ?? "";
  const arquivos    = formData.getAll("arquivos") as File[];
  // Campos do NUGESP ao aprovar
  const elaborador  = (formData.get("elaborador") as string) ?? "";
  const aprovador   = (formData.get("aprovador") as string) ?? "";
  const versao      = (formData.get("versao") as string) ?? "00";
  const revisao     = (formData.get("revisao") as string) ?? "00";
  const criticidade = (formData.get("criticidade") as string) ?? "";
  // Campo do GestDoc ao publicar
  const linkPublicado = (formData.get("linkPublicado") as string) ?? "";
  // Campos de data para publicação
  const dataSolicitacao      = (formData.get("dataSolicitacao") as string) ?? "";
  const dataValidacao        = (formData.get("dataValidacao") as string) ?? "";
  const dataPadronizacao     = (formData.get("dataPadronizacao") as string) ?? new Date().toLocaleDateString("pt-BR");
  const dataPublicacao       = (formData.get("dataPublicacao") as string) ?? new Date().toLocaleDateString("pt-BR");
  const prazoMaxPadronizacao = (formData.get("prazoMaxPadronizacao") as string) ?? "";

  // Validações por ação
  const erros: string[] = [];
  if (!acao) erros.push("Ação não informada.");
  if ((acao === "RT_REPROVA" || acao === "NUGESP_REPROVA") && !comentario.trim()) {
    erros.push("Comentário obrigatório ao reprovar/devolver.");
  }
  if (acao === "UNIDADE_REENVIO" && arquivos.length === 0) {
    erros.push("Anexe ao menos um documento ao reenviar.");
  }
  if (acao === "GESTDOC_PADRONIZOU" && arquivos.length === 0) {
    erros.push("Anexe o documento padronizado.");
  }
  if (erros.length > 0) return NextResponse.json({ error: erros.join(" | ") }, { status: 400 });

  // Aplica transição
  let novaEtapa: Etapa;
  try {
    novaEtapa = aplicarTransicao(sol.etapaAtual as Etapa, acao, papel as PapelFluxo);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // Gera código quando NUGESP aprova
  let codigoGerado = sol.codigoGerado;
  if (acao === "NUGESP_APROVA" && !codigoGerado) {
    const accessToken  = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    if (accessToken && sol.tipoDocumento && sol.setorSigla) {
      // Mapeia tipo de documento para sigla
      const tipoMap: Record<string, string> = {
        "Política": "POL", "Regimento": "REG", "Regulamento": "REL",
        "Diretrizes": "DIZ", "Ficha Técnica do Indicador": "FTI",
        "Fichas e Formulários": "FFO", "Fluxogramas": "FLU",
        "Instruções de Trabalho": "ITA", "Manual": "MAN",
        "Mapeamento de Processos": "MAP", "Normas Técnicas": "NTE",
        "Normatização": "NOR", "Planos": "PLA", "Plano de Contingência": "PLC",
        "Plano de Segurança do Paciente": "PSP", "Protocolo": "PRO",
        "Protocolo Clínico Gerenciado": "PCG", "Protocolos de Segurança Gerenciados": "PSG",
        "Procedimento Operacional Padrão": "POP", "Interação de Processos": "INT",
        "Modelagem de Processos": "MOD", "Pactuações": "PAC",
      };
      const tipoSigla = tipoMap[sol.tipoDocumento] ?? sol.tipoDocumento.substring(0, 3).toUpperCase();
      try {
        codigoGerado = await gerarCodigo(accessToken, refreshToken, tipoSigla, sol.setorSigla);
      } catch {
        codigoGerado = `${tipoSigla}.${sol.setorSigla}.001`;
      }
    }
  }

  try {
    // Atualiza solicitação em transação
    const updateData: any = { etapaAtual: novaEtapa };
    if (acao === "NUGESP_APROVA") {
      updateData.codigoGerado = codigoGerado;
      updateData.elaborador   = elaborador || null;
      updateData.aprovador    = aprovador  || null;
      updateData.versao       = versao     || "00";
      updateData.revisao      = revisao    || "00";
      updateData.criticidade  = criticidade || null;
    }
    if (acao === "GESTDOC_PUBLICOU" && linkPublicado) {
      updateData.linkPublicado = linkPublicado;
    }

    await prisma.$transaction(async tx => {
      await tx.solicitacao.update({ where: { id }, data: updateData });
      await tx.solicitacaoEtapa.create({
        data: {
          solicitacaoId: id,
          etapa: novaEtapa,
          acao,
          comentario: comentario.trim() || null,
          responsavelId: userId,
        },
      });
    });

    // Upload de anexos
    for (const file of arquivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToDrive(userId, file.name, file.type || "application/octet-stream", buffer);
      await prisma.solicitacaoAnexo.create({
        data: {
          solicitacaoId: id,
          nome: uploaded.fileName,
          url: uploaded.fileUrl,
          enviadoPorId: userId,
          etapa: novaEtapa,
        },
      });
    }

    // PUBLICAÇÃO → grava na Lista Mestra
    if (acao === "GESTDOC_PUBLICOU") {
      const accessToken  = (session as any).accessToken;
      const refreshToken = (session as any).refreshToken;
      if (accessToken && codigoGerado) {
        const tipoNome = sol.tipoDocumento ?? "";
        const setor = SETORES.find(s => s.sigla === sol.setorSigla);
        const unidadeNome = sol.unidade?.nome ?? user?.unidade?.nome ?? "";
        const unidadeSigla = sol.unidade?.sigla ?? user?.unidade?.sigla ?? "";
        const userName = session.user?.name ?? "";
        const userEmail = session.user?.email ?? "";
        const hoje = new Date().toLocaleDateString("pt-BR");

        try {
          await ensureHeaders(accessToken, refreshToken);
          await adicionarNaPlanilha(accessToken, refreshToken, {
            tipoDocumento:        tipoNome,
            nivel:                "",
            codigo:               codigoGerado,
            titulo:               sol.titulo,
            unidade:              unidadeSigla,
            setor:                setor?.nome ?? sol.setorSigla ?? "",
            statusDemanda:        "Concluída",
            statusDocumento:      "VIGENTE",
            vigencia:             "",
            dataSolicitacao:      dataSolicitacao || sol.createdAt.toLocaleDateString("pt-BR"),
            linkEmail:            linkPublicado || sol.anexos[0]?.url || "",
            encaminhadoValidacao: "",
            dataValidacao,
            prazoMaxPadronizacao,
            dataPadronizacao,
            dataPublicacao:       dataPublicacao || hoje,
            versao:               sol.versao ?? "00",
            revisao:              sol.revisao ?? "00",
            elaborador:           sol.elaborador ?? "",
            aprovador:            sol.aprovador  ?? "",
            concluidaPor:         `${userName} (${userEmail})`,
            cadastradoPor:        `${userName} (${userEmail})`,
          });
        } catch (e: any) {
          console.error("Erro ao gravar na Lista Mestra:", e.message);
        }
      }
    }

    return NextResponse.json({ success: true, novaEtapa, codigoGerado });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
