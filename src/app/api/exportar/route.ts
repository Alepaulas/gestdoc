import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const papel = (session.user as any).papelFluxo as string;
  const role  = (session.user as any).role as string;
  if (papel !== "GESTDOC" && role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito a ADMIN e GESTDOC." }, { status: 403 });
  }

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  const formato = new URL(req.url).searchParams.get("formato") ?? "excel";

  try {
    const docs = await lerPlanilha(accessToken, refreshToken);

    if (formato === "excel") {
      // Gera CSV (abre no Excel)
      const headers = [
        "ID","Tipo","Nível","Código","Título","Unidade","Setor",
        "Status Demanda","Status Documento","Vigência","Data Solicitação",
        "Data Padronização","Conformidade","Próxima Revisão","Versão","Revisão",
        "Data Publicação","Dias Vencimento","Status Validade","Elaborador","Aprovador",
        "Cadastrado Em","Cadastrado Por"
      ];
      const rows = docs.map(d => [
        d.id, d.tipoDocumento, d.nivel, d.codigo, d.titulo, d.unidade, d.setor,
        d.statusDemanda, d.statusDocumento, d.vigencia, d.dataSolicitacao,
        d.dataPadronizacao, d.conformidadePrazo, d.dataProximaRevisao, d.versao, d.revisao,
        d.dataPublicacao, d.diasVencimento ?? "", d.statusValidade, d.elaborador, d.aprovador,
        d.cadastradoEm, d.cadastradoPor,
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\n");

      const bom = "\uFEFF"; // BOM para Excel reconhecer UTF-8
      return new NextResponse(bom + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lista-mestra-${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.csv"`,
        },
      });
    }

    // PDF — retorna HTML para impressão
    const hoje = new Date().toLocaleDateString("pt-BR");
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Lista Mestra — ${hoje}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 9px; margin: 20px; color: #1e293b; }
    h1 { font-size: 14px; margin-bottom: 4px; }
    p.sub { color: #64748b; font-size: 9px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e3a5f; color: white; padding: 5px 6px; text-align: left; font-size: 8px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .vigente { color: #16a34a; font-weight: bold; }
    .vencendo { color: #d97706; font-weight: bold; }
    .vencido { color: #dc2626; font-weight: bold; }
    .codigo { font-family: monospace; font-weight: bold; color: #4338ca; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>Lista Mestra de Documentos — ISGH</h1>
  <p class="sub">Emitido em ${hoje} · Total: ${docs.length} documentos</p>
  <table>
    <thead>
      <tr>
        <th>Código</th><th>Título</th><th>Tipo</th><th>Unidade</th><th>Setor</th>
        <th>Versão</th><th>Padronização</th><th>Próx. Revisão</th><th>Dias</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${docs.map(d => `
      <tr>
        <td class="codigo">${d.codigo}</td>
        <td>${d.titulo}</td>
        <td>${d.tipoDocumento?.split("—")[0]?.trim() ?? ""}</td>
        <td>${d.unidade}</td>
        <td>${d.setor}</td>
        <td>${d.versao}</td>
        <td>${d.dataPadronizacao}</td>
        <td>${d.dataProximaRevisao}</td>
        <td class="${d.statusValidade?.toLowerCase()}">${d.diasVencimento ?? ""}</td>
        <td class="${d.statusValidade?.toLowerCase()}">${d.statusValidade}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="lista-mestra-${hoje.replace(/\//g,"-")}.html"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
