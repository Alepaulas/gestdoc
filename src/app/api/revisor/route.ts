import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";
import { diffWords, computeStats } from "@/lib/diffWords";
import { registrarAuditoria } from "@/lib/auditoria";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Extrai texto puro de um document.xml do Word, preservando quebras de parágrafo
function extractTextFromDocumentXml(xml: string): string {
  // Cada <w:p> vira uma linha; cada <w:t> dentro vira texto concatenado
  const paragraphs: string[] = [];
  const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;

  const pMatches = xml.match(pRegex) ?? [];
  for (const p of pMatches) {
    let line = "";
    let m: RegExpExecArray | null;
    tRegex.lastIndex = 0;
    while ((m = tRegex.exec(p)) !== null) {
      line += decodeXmlEntities(m[1]);
    }
    paragraphs.push(line);
  }
  return paragraphs.join("\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buf = await file.arrayBuffer();

  if (["docx", "dotx", "dotm"].includes(ext)) {
    const zip = await JSZip.loadAsync(buf);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) throw new Error("Não foi possível ler o conteúdo do documento.");
    return extractTextFromDocumentXml(docXml);
  }

  if (ext === "txt") {
    return new TextDecoder("utf-8").decode(buf);
  }

  throw new Error(`Formato não suportado para comparação: .${ext}`);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const fileA = formData.get("fileA") as File | null;
  const fileB = formData.get("fileB") as File | null;

  if (!fileA || !fileB) {
    return NextResponse.json(
      { error: "Envie os dois arquivos (versão antiga e versão nova)." },
      { status: 400 }
    );
  }

  try {
    const [textA, textB] = await Promise.all([extractText(fileA), extractText(fileB)]);
    const ops = diffWords(textA, textB);
    const stats = computeStats(ops);

    // Registra auditoria
    const userId = (session.user as any).id as string;
    await registrarAuditoria({
      userId,
      acao: "REVISOR_USO",
      descricao: `Comparou "${fileA.name}" vs "${fileB.name}" — ${stats.added} palavras adicionadas, ${stats.removed} removidas`,
    });

    return NextResponse.json({ ops, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao comparar documentos." }, { status: 400 });
  }
}
