import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";
import { REGRAS_FORMATACAO, type TipoDocumento } from "@/lib/normaZero";
import { registrarAuditoria } from "@/lib/auditoria";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function twips(val: number) { return String(val); }

// Patch document.xml — aplica fonte, tamanho, espaçamento e alinhamento
// MAS PRESERVA negrito, itálico e outros atributos de ênfase originais
function patchDocumentXml(xml: string, tipo: TipoDocumento): string {
  const regra = REGRAS_FORMATACAO[tipo];
  const { fonte, tamanho, espacamentoLinha, alinhamento } = regra.corpo;
  const aliStr = alinhamento === "both" ? "both" : alinhamento;

  // Aplica fonte e tamanho nos <w:rPr> — PRESERVA <w:b/>, <w:i/>, <w:u/> e outros
  xml = xml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (_match, inner) => {
    // Remove só fonte e tamanho antigos — NÃO toca em w:b, w:i, w:u, w:color etc.
    let cleaned = inner
      .replace(/<w:rFonts[^>]*\/?>/g, "").replace(/<\/w:rFonts>/g, "")
      .replace(/<w:sz [^/]*\/>/g, "").replace(/<w:szCs [^/]*\/>/g, "");
    return `<w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/>${cleaned}</w:rPr>`;
  });

  // Runs sem rPr — adiciona fonte e tamanho, sem negrito
  xml = xml.replace(/<w:r>(?![\s\S]*?<w:rPr)/g,
    `<w:r><w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/></w:rPr>`
  );

  // Espaçamento e alinhamento nos parágrafos (pPr)
  xml = xml.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/g, (_match, inner) => {
    let cleaned = inner
      .replace(/<w:spacing[^/]*\/>/g, "")
      .replace(/<w:jc[^/]*\/>/g, "");
    return `<w:pPr><w:spacing w:line="${espacamentoLinha}" w:lineRule="auto"/><w:jc w:val="${aliStr}"/>${cleaned}</w:pPr>`;
  });

  // Parágrafos sem pPr
  xml = xml.replace(/<w:p>(?![\s\S]*?<w:pPr)/g,
    `<w:p><w:pPr><w:spacing w:line="${espacamentoLinha}" w:lineRule="auto"/><w:jc w:val="${aliStr}"/></w:pPr>`
  );

  return xml;
}

// Patch styles.xml — fonte e tamanho apenas, PRESERVA negrito dos estilos
function patchStylesXml(xml: string, tipo: TipoDocumento): string {
  const regra = REGRAS_FORMATACAO[tipo];
  const { fonte, tamanho } = regra.corpo;

  xml = xml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (_match, inner) => {
    let cleaned = inner
      .replace(/<w:rFonts[^>]*\/?>/g, "").replace(/<\/w:rFonts>/g, "")
      .replace(/<w:sz [^/]*\/>/g, "").replace(/<w:szCs [^/]*\/>/g, "");
    // Preserva w:b e demais tags de ênfase do estilo original
    return `<w:rPr><w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}" w:eastAsia="${fonte}"/><w:sz w:val="${tamanho}"/><w:szCs w:val="${tamanho}"/>${cleaned}</w:rPr>`;
  });

  return xml;
}

// Patch margens
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
  if (!tipo || !REGRAS_FORMATACAO[tipo]) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["docx", "dotx", "dotm"].includes(ext)) {
    return NextResponse.json({ error: "Apenas .docx, .dotx e .dotm são suportados." }, { status: 400 });
  }

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
    const regra = REGRAS_FORMATACAO[tipo];
    const outName = file.name.replace(/(\.\w+)$/, `_${tipo}_formatado$1`);

    const userId = (session.user as any).id as string;
    await registrarAuditoria({
      userId,
      acao: "FORMATADOR_USO",
      descricao: `Formatou documento "${file.name}" como ${tipo} (${regra.nome})`,
    });

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "X-Tipo-Documento": regra.nome,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao formatar." }, { status: 500 });
  }
}
