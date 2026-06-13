import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import { formatDate } from "./utils";

// Template path – we'll create a base template if none exists
const TEMPLATES_DIR = path.join(process.cwd(), "templates");

export interface DocxData {
  codigo: string;
  titulo: string;
  versao: string;
  categoria: string;
  siglaCategoria: string;
  unidade: string;
  setor: string;
  area: string;
  responsavel: string;
  emailResponsavel: string;
  dataEmissao: string;
  dataRevisao: string;
  descricao: string;
  itensONA: string;
  ano: string;
}

export async function gerarDocx(templateNome: string, dados: DocxData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATES_DIR, templateNome);

  if (!fs.existsSync(templatePath)) {
    // Generate a minimal valid base template programmatically
    return gerarDocxSemTemplate(dados);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(dados);
  return doc.getZip().generate({ type: "nodebuffer" });
}

// Fallback: generates a structured Word XML document without a .docx template file
export async function gerarDocxSemTemplate(dados: DocxData): Promise<Buffer> {
  // Minimal valid .docx structure using raw XML
  const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:pStyle w:val="Heading1"/></w:pPr>
    <w:r><w:t>${escXml(dados.unidade)}</w:t></w:r>
  </w:p>
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escXml(dados.titulo)}</w:t></w:r>
  </w:p>
  <w:p><w:r><w:t></w:t></w:r></w:p>
  ${tabelaCabecalho(dados)}
  <w:p><w:r><w:t></w:t></w:r></w:p>
  ${secao("1. Objetivo")}
  ${paragrafo("Descreva o objetivo deste documento.")}
  ${secao("2. Abrangência")}
  ${paragrafo(`${dados.area} — ${dados.setor} — ${dados.unidade}`)}
  ${secao("3. Responsabilidades")}
  ${paragrafo(`Responsável: ${dados.responsavel}`)}
  ${secao("4. Descrição")}
  ${paragrafo(dados.descricao || "Descreva o procedimento passo a passo.")}
  ${secao("5. Referências ONA")}
  ${paragrafo(dados.itensONA || "Nenhum item ONA vinculado.")}
  ${secao("6. Histórico de Revisões")}
  ${tabelaHistorico(dados)}
  <w:sectPr/>
</w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
</w:styles>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rootRels);
  zip.file("word/document.xml", wordXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/_rels/document.xml.rels", relsXml);

  return zip.generate({ type: "nodebuffer", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function escXml(s: string) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function paragrafo(texto: string) {
  return `<w:p><w:r><w:t xml:space="preserve">${escXml(texto)}</w:t></w:r></w:p>`;
}

function secao(titulo: string) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escXml(titulo)}</w:t></w:r></w:p>`;
}

function cel(texto: string, bold = false) {
  return `<w:tc><w:p><w:r><w:rPr>${bold?"<w:b/>":""}</w:rPr><w:t>${escXml(texto)}</w:t></w:r></w:p></w:tc>`;
}

function tabelaCabecalho(d: DocxData) {
  return `<w:tbl>
  <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
    <w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>
    <w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>
    <w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>
  </w:tblBorders></w:tblPr>
  <w:tr>${cel("Código",true)}${cel(d.codigo)}</w:tr>
  <w:tr>${cel("Categoria",true)}${cel(d.categoria)}</w:tr>
  <w:tr>${cel("Versão",true)}${cel(d.versao)}</w:tr>
  <w:tr>${cel("Área",true)}${cel(d.area)}</w:tr>
  <w:tr>${cel("Setor",true)}${cel(d.setor)}</w:tr>
  <w:tr>${cel("Unidade",true)}${cel(d.unidade)}</w:tr>
  <w:tr>${cel("Responsável",true)}${cel(d.responsavel)}</w:tr>
  <w:tr>${cel("Data de Emissão",true)}${cel(d.dataEmissao)}</w:tr>
  <w:tr>${cel("Próxima Revisão",true)}${cel(d.dataRevisao)}</w:tr>
</w:tbl>`;
}

function tabelaHistorico(d: DocxData) {
  return `<w:tbl>
  <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
    <w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>
    <w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>
    <w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>
  </w:tblBorders></w:tblPr>
  <w:tr>${cel("Versão",true)}${cel("Data",true)}${cel("Descrição",true)}${cel("Responsável",true)}</w:tr>
  <w:tr>${cel(d.versao)}${cel(d.dataEmissao)}${cel("Elaboração inicial")}${cel(d.responsavel)}</w:tr>
</w:tbl>`;
}
