"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Package, RefreshCw, Download, ExternalLink, MessageSquarePlus, X, Save } from "lucide-react";
import { useSession } from "next-auth/react";

const ST: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  VIGENTE:  { label:"Vigente",  bg:"#f0fdf4", text:"#15803d", dot:"#16a34a" },
  VENCENDO: { label:"Vencendo", bg:"#fffbeb", text:"#92400e", dot:"#d97706" },
  VENCIDO:  { label:"Vencido",  bg:"#fef2f2", text:"#991b1b", dot:"#dc2626" },
};

interface ObsEntry {
  texto: string;
  autor: string;
  data: string;
}

export default function Inventario() {
  const { data: session } = useSession();
  const [docs, setDocs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [setorFiltro, setSetor]   = useState("");
  const [statusFiltro, setStatus] = useState("");
  const [setores, setSetores]     = useState<string[]>([]);
  const [obsMap, setObsMap]       = useState<Record<string, ObsEntry>>({});
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [obsTemp, setObsTemp]     = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("inventario_obs_v2");
      if (saved) setObsMap(JSON.parse(saved));
    } catch {}
  }, []);

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError("");
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFiltro) p.set("status", statusFiltro);
    const res = await fetch(`/api/lista-mestra?${p}`);
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    const todos = data.docs ?? [];
    const sets = [...new Set(todos.map((d: any) => d.localizacao).filter(Boolean))].sort() as string[];
    setSetores(sets);
    setDocs(todos);
    setLoading(false);
  }, [search, statusFiltro]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filtrados = setorFiltro ? docs.filter(d => d.localizacao === setorFiltro) : docs;
  const total    = filtrados.length;
  const vigentes = filtrados.filter(d => d.status === "VIGENTE").length;
  const vencendo = filtrados.filter(d => d.status === "VENCENDO").length;
  const vencidos = filtrados.filter(d => d.status === "VENCIDO").length;

  function abrirObs(key: string) {
    setObsTemp(obsMap[key]?.texto ?? "");
    setEditandoObs(key);
  }

  function salvarObs(key: string) {
    const autor = session?.user?.name ?? "Usuário";
    const agora = new Date().toLocaleString("pt-BR");
    const entry: ObsEntry = { texto: obsTemp, autor, data: agora };
    const novo = { ...obsMap, [key]: entry };
    setObsMap(novo);
    try { localStorage.setItem("inventario_obs_v2", JSON.stringify(novo)); } catch {}
    setEditandoObs(null);
  }

  function exportarCSV() {
    const header = ["CÓDIGO","DOCUMENTO","TIPO","LOCALIZAÇÃO","UNIDADE","RESPONSÁVEL","PADRONIZAÇÃO","REVISÃO","STATUS","LINK","OBSERVAÇÃO","INCLUÍDO POR","DATA DA OBSERVAÇÃO"];
    const rows = filtrados.map(d => {
      const obs = obsMap[d.codigo || String(d._linha)];
      return [d.codigo,d.titulo,d.tipo,d.localizacao,d.unidade,d.nome,d.dataPadronizacao,d.dataRevisao,d.status,d.linkEditavel,obs?.texto??"",obs?.autor??"",obs?.data??""];
    });
    const csv = [header,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`inventario_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-700"/>Inventário de Documentos
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Fonte: planilha LISTA_MESTRE · observações com autor e data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDocs} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5"/>Atualizar
          </button>
          <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
            <Download className="w-3.5 h-3.5"/>Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          {label:"Total",   value:total,    color:"text-blue-700",    bg:"bg-blue-50"},
          {label:"Vigentes",value:vigentes, color:"text-emerald-700", bg:"bg-emerald-50"},
          {label:"Vencendo",value:vencendo, color:"text-amber-700",   bg:"bg-amber-50"},
          {label:"Vencidos",value:vencidos, color:"text-red-700",     bg:"bg-red-50"},
        ].map(k=>(
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por título, código, responsável..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={setorFiltro} onChange={e=>setSetor(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
          <option value="">Todos os setores</option>
          {setores.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFiltro} onChange={e=>setStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          <option value="VIGENTE">Vigente</option>
          <option value="VENCENDO">Vencendo</option>
          <option value="VENCIDO">Vencido</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error && <div className="p-6 text-center text-amber-700 text-sm">⚠️ {error}</div>}
        {loading && !error && <div className="flex items-center justify-center h-48"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>}
        {!loading && !error && filtrados.length === 0 && (
          <div className="flex flex-col items-center h-48 justify-center text-slate-400">
            <Package className="w-10 h-10 mb-2 text-slate-200"/>
            <p className="text-sm">Nenhum documento encontrado</p>
          </div>
        )}
        {!loading && !error && filtrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"1100px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Código","Documento","Tipo","Setor","Unidade","Responsável","Padronização","Revisão","Status","Link","Observação","Incluído por","Data obs."].map(h=>(
                    <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((doc, i) => {
                  const st = ST[doc.status] ?? ST.VIGENTE;
                  const obsKey = doc.codigo || String(i);
                  const obsEntry = obsMap[obsKey];
                  const isEditingThis = editandoObs === obsKey;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{doc.codigo||"—"}</span>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="font-semibold text-slate-900 truncate">{doc.titulo}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.tipo?.split("—")[0]?.trim()||"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-700 font-medium">{doc.localizacao||"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.unidade||"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.nome||"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.dataPadronizacao||"—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{doc.dataRevisao||"—"}</td>
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

                      {/* Observação editável */}
                      <td className="px-3 py-3 min-w-[160px]">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus value={obsTemp} onChange={e=>setObsTemp(e.target.value)}
                              onKeyDown={e=>{ if(e.key==="Enter") salvarObs(obsKey); if(e.key==="Escape") setEditandoObs(null); }}
                              className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Digite a observação..."/>
                            <button onClick={()=>salvarObs(obsKey)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-3.5 h-3.5"/></button>
                            <button onClick={()=>setEditandoObs(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group cursor-pointer" onClick={()=>abrirObs(obsKey)}>
                            {obsEntry?.texto
                              ? <span className="text-slate-700 truncate max-w-[120px]">{obsEntry.texto}</span>
                              : <span className="text-slate-300 italic">Adicionar obs...</span>}
                            <MessageSquarePlus className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors"/>
                          </div>
                        )}
                      </td>

                      {/* Incluído por */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {obsEntry?.autor
                          ? <span className="text-slate-600 text-[11px]">{obsEntry.autor}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Data da obs */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {obsEntry?.data
                          ? <span className="text-slate-500 text-[10px]">{obsEntry.data}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <p className="text-xs text-slate-500">{total} documentos{setorFiltro?` · ${setorFiltro}`:""} · Clique em "Adicionar obs..." para incluir observações</p>
          <button onClick={exportarCSV} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
