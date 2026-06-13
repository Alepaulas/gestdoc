"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Download, ExternalLink, Filter, FileText, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { formatDate, diasRestantes } from "@/lib/utils";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  VIGENTE:    { label:"Vigente",    dot:"#16a34a", text:"#15803d", bg:"#f0fdf4" },
  VENCENDO:   { label:"Vencendo",   dot:"#d97706", text:"#92400e", bg:"#fffbeb" },
  VENCIDO:    { label:"Vencido",    dot:"#dc2626", text:"#991b1b", bg:"#fef2f2" },
  EM_REVISAO: { label:"Em Revisão", dot:"#2563eb", text:"#1e40af", bg:"#eff6ff" },
  OBSOLETO:   { label:"Obsoleto",   dot:"#64748b", text:"#475569", bg:"#f8fafc" },
};

export default function ListaMestra() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [tipos, setTipos] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (tipoFiltro) p.set("tipo", tipoFiltro);
    if (statusFiltro) p.set("status", statusFiltro);
    if (unidadeFiltro) p.set("unidade", unidadeFiltro);
    const res = await fetch(`/api/lista-mestra?${p}`);
    setDocs(await res.json());
    setLoading(false);
  }, [search, tipoFiltro, statusFiltro, unidadeFiltro]);

  useEffect(() => {
    fetchDocs();
    fetch("/api/categorias").then(r=>r.json()).then(setTipos);
    fetch("/api/unidades").then(r=>r.json()).then(setUnidades);
  }, [fetchDocs]);

  async function exportarExcel() {
    // Gera CSV seguindo o padrão da Lista Mestra
    const header = ["CÓDIGO","NOME DO DOCUMENTO","TIPO","NÍVEL","UNIDADE","SETOR","ÁREA","RESPONSÁVEL","DATA PADRONIZAÇÃO","DATA REVISÃO","PRÓXIMA REVISÃO","STATUS","LINK EDITÁVEL","LINK PDF","OBS"];
    const rows = docs.map(d => [
      d.codigo, d.titulo, d.tipo?.sigla, d.tipo?.nivel,
      d.area?.setor?.unidade?.nome, d.area?.setor?.nome, d.area?.nome,
      d.responsavel?.name,
      formatDate(d.dataPadronizacao), formatDate(d.dataRevisao), formatDate(d.proximaRevisao),
      d.status, d.linkEditavel ?? "", d.linkPdf ?? "", d.observacao ?? ""
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`lista_mestra_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const vigentes = docs.filter(d=>d.status==="VIGENTE").length;
  const vencendo = docs.filter(d=>d.status==="VENCENDO").length;
  const vencidos = docs.filter(d=>d.status==="VENCIDO").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lista Mestra de Documentos Internos</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Controle oficial conforme <span className="font-medium text-blue-700">NOR.SGQ.001 — Norma Zero ISGH</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDocs} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5"/>Atualizar
          </button>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Download className="w-3.5 h-3.5"/>Exportar CSV
          </button>
          <Link href="/documentos/novo" className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
            <FileText className="w-3.5 h-3.5"/>Novo documento
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label:"Total de documentos", value:docs.length, icon:FileText, color:"text-blue-700", bg:"bg-blue-50" },
          { label:"Vigentes", value:vigentes, icon:CheckCircle, color:"text-emerald-700", bg:"bg-emerald-50" },
          { label:"Vencendo (30 dias)", value:vencendo, icon:Clock, color:"text-amber-700", bg:"bg-amber-50" },
          { label:"Vencidos", value:vencidos, icon:AlertTriangle, color:"text-red-700", bg:"bg-red-50" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <k.icon className={`w-4 h-4 ${k.color}`}/>
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, código..." className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          {tipos.map((t:any)=><option key={t.id} value={t.sigla}>{t.sigla} — {t.nome}</option>)}
        </select>
        <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={unidadeFiltro} onChange={e=>setUnidadeFiltro(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as unidades</option>
          {unidades.map((u:any)=><option key={u.id} value={u.sigla}>{u.sigla} — {u.nome}</option>)}
        </select>
      </div>

      {/* Tabela Lista Mestra */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <FileText className="w-10 h-10 mb-2 text-slate-200"/>
            <p className="text-sm">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"1100px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Código","Nome do Documento","Tipo","Localização","Responsável","Data Padronização","Data Revisão","Próxima Revisão","Status","Links","Obs"].map(h=>(
                    <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc:any) => {
                  const dias = diasRestantes(doc.proximaRevisao);
                  const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.VIGENTE;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">{doc.codigo}</span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900 line-clamp-2 max-w-[220px]">{doc.titulo}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:doc.tipo?.cor}}/>
                          <span className="font-mono text-slate-700">{doc.tipo?.sigla}</span>
                          <span className="text-slate-400 text-[10px]">N{doc.tipo?.nivel}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-800 whitespace-nowrap">{doc.area?.setor?.unidade?.sigla}</p>
                        <p className="text-slate-400 whitespace-nowrap">{doc.area?.setor?.sigla} · {doc.area?.sigla}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-slate-700">{doc.responsavel?.name}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        {formatDate(doc.dataPadronizacao)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        {formatDate(doc.dataRevisao)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className={dias < 0 ? "text-red-600 font-semibold" : dias <= 30 ? "text-amber-600 font-semibold" : "text-slate-600"}>
                          {formatDate(doc.proximaRevisao)}
                        </p>
                        {dias < 0
                          ? <p className="text-red-500 text-[10px]">{Math.abs(dias)}d vencido</p>
                          : dias <= 30
                          ? <p className="text-amber-500 text-[10px]">Vence em {dias}d</p>
                          : null}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:st.bg, color:st.text}}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {doc.linkEditavel && (
                            <a href={doc.linkEditavel} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium hover:bg-blue-100 transition-colors"
                              title="Abrir documento editável">
                              <ExternalLink className="w-2.5 h-2.5"/>Editar
                            </a>
                          )}
                          {doc.linkPdf && (
                            <a href={doc.linkPdf} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium hover:bg-red-100 transition-colors"
                              title="Abrir PDF">
                              <ExternalLink className="w-2.5 h-2.5"/>PDF
                            </a>
                          )}
                          {!doc.linkEditavel && !doc.linkPdf && (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[120px]">
                        <p className="text-slate-500 truncate">{doc.observacao || "—"}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">{docs.length} documentos · Lista Mestra conforme NOR.SGQ.001</p>
          <button onClick={exportarExcel} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
