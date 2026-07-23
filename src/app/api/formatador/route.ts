import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";
import { REGRAS_FORMATACAO, type TipoDocumento } from "@/lib/normaZero";

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

  // ── Remove a capa (tudo até a primeira quebra de página, inclusive) ──
  const PAGE_BREAK = /<w:br[^>]*w:type="page"[^>]*\/?>|<w:pageBreakBefore\/>/;
  const breakIdx = xml.search(PAGE_BREAK);

  let corpo = xml;
  if (breakIdx > -1) {
    const endOfPara = xml.indexOf("</w:p>", breakIdx);
    if (endOfPara > -1) {
      // Preserva apenas o conteúdo após a quebra (remove a capa)
      const bodyStart = xml.indexOf("<w:body>");
      const bodyContent = bodyStart > -1 ? xml.slice(bodyStart + "<w:body>".length) : xml;
      const afterBreak = xml.slice(endOfPara + "</w:p>".length);
      // Reconstrói mantendo tags externas
      corpo = xml.slice(0, bodyStart + "<w:body>".length) + afterBreak;
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

    const outputBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const outName = file.name.replace(/(\.\w+)$/, `_${tipo}_formatado$1`);

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao formatar." }, { status: 500 });
  }
}
