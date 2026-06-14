"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Download, ExternalLink, Plus, RefreshCw, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const ST: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  VIGENTE:    { label:"Vigente",    bg:"#f0fdf4", text:"#15803d", dot:"#16a34a" },
  VENCENDO:   { label:"Vencendo",   bg:"#fffbeb", text:"#92400e", dot:"#d97706" },
  VENCIDO:    { label:"Vencido",    bg:"#fef2f2", text:"#991b1b", dot:"#dc2626" },
  EM_REVISAO: { label:"Em Revisão", bg:"#eff6ff", text:"#1e40af", dot:"#2563eb" },
  OBSOLETO:   { label:"Obsoleto",   bg:"#f8fafc", text:"#475569", dot:"#94a3b8" },
};

export default function ListaMestra() {
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError("");
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFiltro) p.set("status", statusFiltro);
    const res = await fetch(`/api/lista-mestra?${p}`);
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDocs(data.docs ?? []); setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, statusFiltro]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  function exportarCSV() {
    const header = ["NOME","DOCUMENTO","LINK DOCUMENTO (editável)","CÓDIGO","TIPO","LOCALIZAÇÃO","UNIDADE","ÁREA","STATUS","OBS","DATA DE PADRONIZAÇÃO","DATA DE REVISÃO"];
    const rows = docs.map(d => [d.nome,d.titulo,d.linkEditavel,d.codigo,d.tipo,d.localizacao,d.unidade,d.area,d.status,d.observacao,d.dataPadronizacao,d.dataRevisao]);
    const csv = [header,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`lista_mestra_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const vigentes = docs.filter(d=>d.status==="VIGENTE").length;
  const vencendo = docs.filter(d=>d.status==="VENCENDO").length;
  const vencidos = docs.filter(d=>d.status==="VENCIDO").length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lista Mestra de Documentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fonte: Google Sheets · <span className="font-medium text-blue-700">NOR.SGQ.001 — Norma Zero ISGH</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDocs} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5"/>Atualizar
          </button>
          <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
            <Download className="w-3.5 h-3.5"/>Exportar CSV
          </button>
          <Link href="/documentos/novo" className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800">
            <Plus className="w-3.5 h-3.5"/>Novo documento
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label:"Total", value:total, icon:FileText, color:"text-blue-700", bg:"bg-blue-50" },
          { label:"Vigentes", value:vigentes, icon:CheckCircle, color:"text-emerald-700", bg:"bg-emerald-50" },
          { label:"Vencendo", value:vencendo, icon:Clock, color:"text-amber-700", bg:"bg-amber-50" },
          { label:"Vencidos", value:vencidos, icon:AlertTriangle, color:"text-red-700", bg:"bg-red-50" },
        ].map(k=>(
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center`}>
              <k.icon className={`w-4 h-4 ${k.color}`}/>
            </div>
            <div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por nome, documento ou código..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error && (
          <div className="p-6 text-center text-red-600 text-sm">
            ⚠️ {error}
            {error.includes("Token") && <p className="mt-2 text-slate-500">Faça <a href="/api/auth/signout" className="text-blue-600 underline">logout</a> e entre novamente para reconectar o Google.</p>}
          </div>
        )}
        {loading && !error && (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        )}
        {!loading && !error && docs.length === 0 && (
          <div className="flex flex-col items-center h-48 justify-center text-slate-400">
            <FileText className="w-10 h-10 mb-2 text-slate-200"/>
            <p className="text-sm">Nenhum documento encontrado na planilha</p>
            <p className="text-xs mt-1 text-slate-300">Verifique se a aba se chama LISTA_MESTRE</p>
          </div>
        )}
        {!loading && !error && docs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"1000px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Código","Documento","Tipo","Localização","Unidade","Área","Responsável","Padronização","Revisão","Status","Link","Obs"].map(h=>(
                    <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc, i) => {
                  const st = ST[doc.status] ?? ST.VIGENTE;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">{doc.codigo}</span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="font-semibold text-slate-900 truncate">{doc.titulo}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.tipo}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.localizacao}</td>
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-700">{doc.unidade}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.area}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.nome}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.dataPadronizacao}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.dataRevisao}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:st.bg,color:st.text}}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {doc.linkEditavel
                          ? <a href={doc.linkEditavel} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium hover:bg-blue-100">
                              <ExternalLink className="w-2.5 h-2.5"/>Abrir
                            </a>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 max-w-[100px]">
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
          <p className="text-xs text-slate-500">{total} documentos · Lido da planilha LISTA_MESTRE em tempo real</p>
          <button onClick={exportarCSV} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
