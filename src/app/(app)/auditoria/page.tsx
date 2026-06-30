"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Download, AlertTriangle, CheckCircle, XCircle, Filter, ClipboardList } from "lucide-react";

interface DocAuditoria {
  titulo: string; codigo: string; tipoDocumento: string; unidade: string;
  setor: string; elaborador: string; statusValidade: string; dataProximaRevisao: string;
  dataPadronizacao: string; linkEmail: string;
  // conformidade calculada
  temCodigo: boolean; temTitulo: boolean; temTipo: boolean;
  temUnidade: boolean; temArea: boolean; temResponsavel: boolean;
  temDataPadronizacao: boolean; temDataRevisao: boolean;
  temLink: boolean; estaVigente: boolean;
  score: number; // 0-10
  naoConformidades: string[];
}

const PERIODOS = [
  { label:"Todos os períodos", valor:"" },
  { label:"Últimos 30 dias", valor:"30" },
  { label:"Últimos 90 dias", valor:"90" },
  { label:"Últimos 6 meses", valor:"180" },
  { label:"Último ano", valor:"365" },
];

function calcAuditoria(doc: any): DocAuditoria {
  const naoConformidades: string[] = [];

  const temCodigo = !!doc.codigo?.trim();
  const temTitulo = !!doc.titulo?.trim();
  const temTipo = !!doc.tipoDocumento?.trim();
  const temUnidade = !!doc.unidade?.trim();
  const temArea = !!doc.setor?.trim();
  const temResponsavel = !!doc.elaborador?.trim();
  const temDataPadronizacao = !!doc.dataPadronizacao?.trim();
  const temDataRevisao = !!doc.dataProximaRevisao?.trim();
  const temLink = !!doc.linkEmail?.trim();
  const estaVigente = doc.statusValidade === "VIGENTE";

  if (!temCodigo) naoConformidades.push("Código não preenchido");
  if (!temTitulo) naoConformidades.push("Nome do documento ausente");
  if (!temTipo) naoConformidades.push("Tipo não informado");
  if (!temUnidade) naoConformidades.push("Unidade não informada");
  if (!temArea) naoConformidades.push("Setor não informado");
  if (!temResponsavel) naoConformidades.push("Elaborador não identificado");
  if (!temDataPadronizacao) naoConformidades.push("Data de padronização ausente");
  if (!temDataRevisao) naoConformidades.push("Data de revisão ausente");
  if (!temLink) naoConformidades.push("Link do documento não cadastrado");
  if (!estaVigente) naoConformidades.push(`Documento ${doc.statusValidade?.toLowerCase() || "sem status"}`);

  const score = 10 - naoConformidades.length;

  return {
    ...doc, temCodigo, temTitulo, temTipo, temUnidade, temArea,
    temResponsavel, temDataPadronizacao, temDataRevisao,
    temLink, estaVigente, score: Math.max(0, score), naoConformidades,
  };
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 8 ? "#16a34a" : score >= 5 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}/10</span>
    </div>
  );
}

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    : <XCircle className="w-3.5 h-3.5 text-red-400" />;
}

export default function Auditoria() {
  const [docs, setDocs] = useState<DocAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [responsavelFiltro, setResponsavelFiltro] = useState("");
  const [apenasNC, setApenasNC] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/lista-mestra");
    const data = await res.json();
    const auditados = (data.docs ?? []).map(calcAuditoria);
    setDocs(auditados);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const tipos = [...new Set(docs.map(d => d.tipoDocumento?.split("—")[0]?.trim()).filter(Boolean))];
  const unidades = [...new Set(docs.map(d => d.unidade).filter(Boolean))];
  const responsaveis = [...new Set(docs.map(d => d.elaborador).filter(Boolean))];

  const filtrados = docs.filter(d => {
    if (search && !d.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !d.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    if (tipoFiltro && !d.tipoDocumento.includes(tipoFiltro)) return false;
    if (unidadeFiltro && d.unidade !== unidadeFiltro) return false;
    if (responsavelFiltro && d.elaborador !== responsavelFiltro) return false;
    if (apenasNC && d.naoConformidades.length === 0) return false;
    return true;
  });

  const totalNC = filtrados.filter(d => d.naoConformidades.length > 0).length;
  const totalConformes = filtrados.filter(d => d.naoConformidades.length === 0).length;
  const scoreMedia = filtrados.length > 0
    ? Math.round(filtrados.reduce((acc, d) => acc + d.score, 0) / filtrados.length * 10) / 10
    : 0;

  function exportarCSV() {
    const header = ["CÓDIGO","DOCUMENTO","TIPO","UNIDADE","SETOR","ELABORADOR","STATUS","DATA REVISÃO","SCORE","NÃO CONFORMIDADES"];
    const rows = filtrados.map(d => [
      d.codigo, d.titulo, d.tipoDocumento, d.unidade, d.setor, d.elaborador,
      d.statusValidade, d.dataProximaRevisao, `${d.score}/10`, d.naoConformidades.join(" | ")
    ]);
    const csv = [header,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`auditoria_documental_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-700"/>Auditoria Documental
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Checklist de conformidade · Não conformidades · Fonte: planilha LISTA_MESTRE</p>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
          <Download className="w-3.5 h-3.5"/>Exportar relatório
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{filtrados.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Documentos auditados</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{totalConformes}</p>
          <p className="text-xs text-slate-500 mt-0.5">Em conformidade</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-red-700">{totalNC}</p>
          <p className="text-xs text-slate-500 mt-0.5">Com não conformidades</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-slate-700">{scoreMedia}</p>
          <p className="text-xs text-slate-500 mt-0.5">Score médio (0–10)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar documento..." className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          {tipos.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={unidadeFiltro} onChange={e=>setUnidadeFiltro(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as unidades</option>
          {unidades.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
        <select value={responsavelFiltro} onChange={e=>setResponsavelFiltro(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={apenasNC} onChange={e=>setApenasNC(e.target.checked)} className="rounded"/>
          Apenas não conformidades
        </label>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center h-48 justify-center text-slate-400">
            <CheckCircle className="w-10 h-10 mb-2 text-emerald-300"/>
            <p className="text-sm">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"900px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Código</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Documento</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Unidade</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Responsável</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Código">Cód</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Tipo">Tipo</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Responsável">Resp</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Data padronização">Data</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Link">Link</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]" title="Vigente">Vigente</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Score</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">NCs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((doc, i) => (
                  <>
                    <tr key={i}
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${doc.naoConformidades.length > 0 ? "border-l-2 border-red-300" : "border-l-2 border-emerald-300"}`}
                      onClick={() => setExpandido(expandido === i ? null : i)}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">{doc.codigo || "—"}</span>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="font-semibold text-slate-900 truncate">{doc.titulo}</p>
                        <p className="text-slate-400 text-[10px] truncate">{doc.tipoDocumento}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-slate-700 font-medium">{doc.unidade || "—"}</p>
                        <p className="text-slate-400 text-[10px]">{doc.setor || "—"}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.elaborador || "—"}</td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.temCodigo}/></td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.temTipo}/></td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.temResponsavel}/></td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.temDataPadronizacao}/></td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.temLink}/></td>
                      <td className="px-2 py-3 text-center"><Check ok={doc.estaVigente}/></td>
                      <td className="px-3 py-3"><ScoreBar score={doc.score}/></td>
                      <td className="px-3 py-3">
                        {doc.naoConformidades.length === 0
                          ? <span className="text-emerald-600 text-[10px] font-semibold">Conforme</span>
                          : <span className="text-red-600 text-[10px] font-semibold">{doc.naoConformidades.length} NC{doc.naoConformidades.length > 1 ? "s" : ""}</span>
                        }
                      </td>
                    </tr>
                    {expandido === i && doc.naoConformidades.length > 0 && (
                      <tr key={`${i}-detail`}>
                        <td colSpan={12} className="px-6 py-3 bg-red-50 border-b border-red-100">
                          <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/>Não conformidades identificadas:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {doc.naoConformidades.map((nc, j) => (
                              <span key={j} className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-lg font-medium">
                                {nc}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <p className="text-xs text-slate-500">{filtrados.length} documentos · Clique em uma linha para ver as não conformidades</p>
          <button onClick={exportarCSV} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar relatório
          </button>
        </div>
      </div>
    </div>
  );
}
