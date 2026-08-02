import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";
import { REGRAS_FORMATACAO, type TipoDocumento } from "@/lib/normaZero";
import { buscarDocumentoPorNomeArquivo, montarNomeArquivo } from "@/lib/baseDocumentos";
import { converterDocxParaPdf } from "@/lib/drive";

// Bullet points: 6.5pt = 13 em half-points
const BULLET_SIZE = "13";

function isBulletParagraph(pPrInner: string): boolean {
  // Parágrafos com numPr são listas/bullets
  return pPrInner.includes("<w:numPr>");
}

function patchDocumentXml(xml: string, tipo: TipoDocumento): string {
  const regra = REGRAS_FORMATACAO[tipo];
  const { fonte, tamanho, espacamentoLinha, alinhamento } = regra.corpo;
  const aliStr = alinhamento === "both" ? "both" : alinhamento;

  // ── Remove a capa (WPS Office) ──
  // WPS não usa quebra de página explícita — a capa é formada por
  // parágrafos em branco + primeira tabela (HISTÓRICO DE ANÁLISE)
  // Estratégia: remove tudo até o fim da primeira <w:tbl>
  let corpo = xml;

  const bodyStart = xml.indexOf("<w:body>");
  const bodyTag = "<w:body>";

  if (bodyStart > -1) {
    const bodyContent = xml.slice(bodyStart + bodyTag.length);

    // Tenta quebra de página explícita primeiro (Word padrão)
    const pageBreakMatch = bodyContent.match(/<w:br[^>]*w:type="page"[^>]*\/?>/);
    const lastRenderedMatch = bodyContent.match(/<w:lastRenderedPageBreak\/>/);

    let cutAfter = -1;

    if (pageBreakMatch?.index !== undefined) {
      const endPara = bodyContent.indexOf("</w:p>", pageBreakMatch.index);
      if (endPara > -1) cutAfter = endPara + "</w:p>".length;
    } else if (lastRenderedMatch?.index !== undefined) {
      const endPara = bodyContent.indexOf("</w:p>", lastRenderedMatch.index);
      if (endPara > -1) cutAfter = endPara + "</w:p>".length;
    } else {
      // WPS sem quebra explícita: remove até o fim da primeira tabela
      const tblStart = bodyContent.indexOf("<w:tbl");
      if (tblStart > -1) {
        const tblEnd = bodyContent.indexOf("</w:tbl>", tblStart);
        if (tblEnd > -1) cutAfter = tblEnd + "</w:tbl>".length;
      }
    }

    if (cutAfter > -1) {
      corpo = xml.slice(0, bodyStart + bodyTag.length) + bodyContent.slice(cutAfter);
    }
  }

  // ── Formata fonte, tamanho, espaçamento — preserva negrito/itálico ──
  function formatarTexto(src: string): string {
    // rPr: atualiza fonte e tamanho, preserva negrito/itálico/cor
    src = src.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (_match, inner) => {
      let cleaned = inner
        .replace(/<w:rFonts[^>]*\/?>/g, "").replace(/<\/w:rFonts>/g, "")
        .replace(/<w:sz [^/]*\/>/g, "").replace(/<w:szCs [^/]*\/>/g, "");
      return `<w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/>${cleaned}</w:rPr>`;
    });

    // Runs sem rPr
    src = src.replace(/<w:r>(?![\s\S]*?<w:rPr)/g,
      `<w:r><w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/></w:rPr>`
    );

    // pPr: espaçamento e alinhamento — bullets recebem tamanho menor
    src = src.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/g, (_match, inner) => {
      const isBullet = isBulletParagraph(inner);
      let cleaned = inner
        .replace(/<w:spacing[^/]*\/>/g, "")
        .replace(/<w:jc[^/]*\/>/g, "");
      return `<w:pPr><w:spacing w:line="${espacamentoLinha}" w:lineRule="auto"/><w:jc w:val="${isBullet ? "left" : aliStr}"/>${cleaned}</w:pPr>`;
    });

    // Parágrafos sem pPr
    src = src.replace(/<w:p>(?![\s\S]*?<w:pPr)/g,
      `<w:p><w:pPr><w:spacing w:line="${espacamentoLinha}" w:lineRule="auto"/><w:jc w:val="${aliStr}"/></w:pPr>`
    );

    // ── Bullets: aplica tamanho 6.5pt nos runs de parágrafos com numPr ──
    // Identifica parágrafos com bullet e reduz o tamanho do texto
    src = src.replace(/<w:p>([\s\S]*?)<\/w:p>/g, (_match, inner) => {
      if (!inner.includes("<w:numPr>")) return _match;
      // Substitui tamanho apenas neste parágrafo
      const bulletInner = inner.replace(
        /<w:sz w:val="[^"]*"\/>/g, `<w:sz w:val="${BULLET_SIZE}"/>`
      ).replace(
        /<w:szCs w:val="[^"]*"\/>/g, `<w:szCs w:val="${BULLET_SIZE}"/>`
      );
      return `<w:p>${bulletInner}</w:p>`;
    });

    return src;
  }

  return formatarTexto(corpo);
}

function patchStylesXml(xml: string, tipo: TipoDocumento): string {
  const { fonte, tamanho } = REGRAS_FORMATACAO[tipo].corpo;
  xml = xml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (_match, inner) => {
    let cleaned = inner
      .replace(/<w:rFonts[^>]*\/?>/g, "").replace(/<\/w:rFonts>/g, "")
      .replace(/<w:sz [^/]*\/>/g, "").replace(/<w:szCs [^/]*\/>/g, "");
    return `<w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/>${cleaned}</w:rPr>`;
  });
  return xml;
}

function patchMargens(xml: string, tipo: TipoDocumento): string {
  const { superior, inferior, esquerda, direita } = REGRAS_FORMATACAO[tipo].margens;
  return xml.replace(
    /<w:pgMar[^/]*\/>/g,
    `<w:pgMar w:top="${superior}" w:right="${direita}" w:bottom="${inferior}" w:left="${esquerda}" w:header="720" w:footer="720" w:gutter="0"/>`
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accessToken = (session as any).accessToken as string | undefined;
  const refreshToken = (session as any).refreshToken as string | undefined;
  if (!accessToken)
    return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipo = formData.get("tipo") as TipoDocumento | null;

  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (!tipo || !REGRAS_FORMATACAO[tipo])
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["docx", "dotx", "dotm"].includes(ext))
    return NextResponse.json({ error: "Apenas .docx, .dotx e .dotm são suportados." }, { status: 400 });

  try {
    // ── 1) Formata o .docx (remove capa, aplica fonte/margens da Norma Zero) ──
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    for (const filename of Object.keys(zip.files)) {
      if (filename === "word/document.xml") {
        const content = await zip.file(filename)!.async("string");
        zip.file(filename, patchMargens(patchDocumentXml(content, tipo), tipo));
      } else if (filename === "word/styles.xml") {
        const content = await zip.file(filename)!.async("string");
        zip.file(filename, patchStylesXml(content, tipo));
      }
    }

    const docxBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    // ── 2) Busca o documento na planilha BASE_DOCUMENTOS pelo nome do arquivo ──
    const doc = await buscarDocumentoPorNomeArquivo(accessToken, refreshToken, file.name).catch(() => null);

    const matched = !!doc;
    const nomeBase = doc
      ? montarNomeArquivo(doc)
      : file.name.replace(/(\.\w+)$/, `_${tipo}_formatado`); // fallback: não achou na planilha

    // ── 3) Converte para PDF sem capa via Google Drive (usa o docx já sem capa) ──
    const pdfBuffer = await converterDocxParaPdf(
      accessToken,
      refreshToken,
      docxBuffer,
      `_tmp_formatador_${Date.now()}`
    );

    return NextResponse.json({
      matched,
      nomeBase,
      docxBase64: docxBuffer.toString("base64"),
      pdfBase64: pdfBuffer.toString("base64"),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao formatar." }, { status: 500 });
  }
}
