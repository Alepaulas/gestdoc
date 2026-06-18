import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Patch XML string: aplica Calibri 10pt negrito em todos os runs e estilos
function patchXml(xmlStr: string, isStyles = false): string {
  // rFonts: garante Calibri em todos os atributos
  xmlStr = xmlStr.replace(/<w:rFonts[^/]*\/>/g, () =>
    `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/>`
  );
  xmlStr = xmlStr.replace(/<w:rFonts([^>]*)>/g, () =>
    `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri">`
  );

  // sz / szCs: força 20 (10pt = 20 half-points)
  xmlStr = xmlStr.replace(/<w:sz w:val="[^"]*"\/>/g, `<w:sz w:val="20"/>`);
  xmlStr = xmlStr.replace(/<w:szCs w:val="[^"]*"\/>/g, `<w:szCs w:val="20"/>`);

  // Negrito: garante <w:b/> em todo <w:rPr>
  // Insere <w:b/> <w:rFonts> <w:sz> <w:szCs> em cada <w:rPr>
  xmlStr = xmlStr.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (_, inner) => {
    // Remove b, rFonts, sz, szCs existentes para reinserir limpos
    let cleaned = inner
      .replace(/<w:b[^/]*\/>/g, "")
      .replace(/<w:b\s*><\/w:b>/g, "")
      .replace(/<w:rFonts[^>]*\/?>/g, "")
      .replace(/<\/w:rFonts>/g, "")
      .replace(/<w:sz [^/]*\/>/g, "")
      .replace(/<w:szCs [^/]*\/>/g, "");
    return `<w:rPr><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/>${cleaned}</w:rPr>`;
  });

  // Garante <w:rPr> em runs que não têm
  xmlStr = xmlStr.replace(/<w:r>(?![\s\S]*?<w:rPr)/g,
    `<w:r><w:rPr><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>`
  );

  return xmlStr;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["docx", "dotx", "dotm"].includes(ext)) {
    return NextResponse.json(
      { error: "Apenas .docx, .dotx e .dotm são suportados na versão web." },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Patcha document.xml e styles.xml
    for (const filename of ["word/document.xml", "word/styles.xml"]) {
      const zipFile = zip.file(filename);
      if (!zipFile) continue;
      const content = await zipFile.async("string");
      const patched = patchXml(content, filename.includes("styles"));
      zip.file(filename, patched);
    }

    const outputBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const outName = file.name.replace(/(\.\w+)$/, "_formatado$1");

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro interno" }, { status: 500 });
  }
}
