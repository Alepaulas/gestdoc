"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Download, RefreshCw, ClipboardPlus, AlertCircle, CheckCircle, Clock, TrendingUp, Save, X } from "lucide-react";

const STATUS_OPTS = ["Pendente","Em validação","Em padronização","Publicada","Cancelada"];
const RESPONSAVEIS = ["Pedro","Rozane"];

const ST_CORES: Record<string, { bg: string; text: string; dot: string }> = {
  "Pendente":         { bg:"#fffbeb", text:"#92400e", dot:"#d97706" },
  "Em validação":     { bg:"#eff6ff", text:"#1e40af", dot:"#2563eb" },
  "Em padronização":  { bg:"#f5f3ff", text:"#5b21b6", dot:"#7c3aed" },
  "Publicada":        { bg:"#f0fdf4", text:"#15803d", dot:"#16a34a" },
  "Cancelada":        { bg:"#f8fafc", text:"#475569", dot:"#94a3b8" },
};

const CONF_CORES: Record<string, { bg: string; text: string }> = {
  "DENTRO DO PRAZO": { bg:"#f0fdf4", text:"#15803d" },
  "FORA DO PRAZO":   { bg:"#fef2f2", text:"#991b1b" },
};

const COLS_TABELA = [
  "ASSUNTO","REMETENTE","DATA DE ENVIO","STATUS","RESPONSÁVEL",
  "DATA DE VALIDAÇÃO","DATA DE PADRONIZAÇÃO","DATA DE PUBLICAÇÃO",
  "TEMPO DE PADRONIZAÇÃO","CONFORMIDADE COM O PRAZO",
];

const COLS_DETALHE = [
  "DESTINATÁRIO","E-MAIL DO SOLICITANTE","IMPORTADO EM",
  "NOME DE QUEM ESTÁ PADRONIZANDO O DOCUMENTO",
  "DATA DE ENVIO PARA VALIDAÇÃO","DATA DA VALIDAÇÃO","TEMPO DE VALIDAÇÃO",
  "CONCLUIDA POR","DATA DE ENVIO PARA PADRONIZAÇÃO","DATA DA PADRONIZAÇÃO",
  "TEMPO TOTAL","PRAZO MÁXIMO PARA PADRONIZAÇÃO",
  "CRIADO_EM","CRIADO_POR","ATUALIZADO_EM","ATUALIZADO_POR",
];

const EDITAVEIS: Record<string, "status"|"responsavel"|"data"> = {
  "STATUS": "status",
  "RESPONSÁVEL": "responsavel",
  "DATA DE PADRONIZAÇÃO": "data",
  "DATA DE PUBLICAÇÃO": "data",
};

export default function Solicitacoes() {
  const [data, setData]             = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [pctConf, setPctConf]       = useState<number|null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [statusFiltro, setStatus]   = useState("");
  const [respFiltro, setResp]       = useState("");
  const [expandido, setExpandido]   = useState<string|null>(null);
  const [editCell, setEditCell]     = useState<{linha:string;col:string}|null>(null);
  const [editVal, setEditVal]       = useState("");
  const [saving, setSaving]         = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFiltro) p.set("status", statusFiltro);
    if (respFiltro) p.set("responsavel", respFiltro);
    const res = await fetch(`/api/solicitacoes?${p}`);
    const json = await res.json();
    if (json.error) { setError(json.error); setLoading(false); return; }
    setData(json.solicitacoes ?? []);
    setTotal(json.total ?? 0);
    setPctConf(json.pctConformidade ?? null);
    setLoading(false);
  }, [search, statusFiltro, respFiltro]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(linha: string, col: string, val: string) {
    setEditCell({ linha, col });
    setEditVal(val);
  }

  async function saveEdit() {
    if (!editCell) return;
    setSaving(true);
    await fetch("/api/solicitacoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linha: parseInt(editCell.linha), campos: { [editCell.col]: editVal } }),
    });
    setSaving(false);
    setEditCell(null);
    await fetchData();
  }

  function exportarCSV() {
    const allCols = [...COLS_TABELA, ...COLS_DETALHE];
    const csv = [allCols, ...data.map(s => allCols.map(c => s[c] ?? ""))]
      .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`solicitacoes_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const concluidas  = data.filter(s => s["STATUS"] === "Publicada").length;
  const emAndamento = data.filter(s => ["Em validação","Em padronização"].includes(s["STATUS"])).length;
  const pendentes   = data.filter(s => s["STATUS"] === "Pendente").length;
  const foraPrazo   = data.filter(s => s["CONFORMIDADE COM O PRAZO"] === "FORA DO PRAZO").length;

  function renderCell(sol: any, col: string) {
    const val = sol[col] ?? "";
    const isEditing = editCell?.linha === sol._linha && editCell?.col === col;
    const tipo = EDITAVEIS[col];

    if (!tipo) {
      // Conformidade com cores
      if (col === "CONFORMIDADE COM O PRAZO") {
        const c = CONF_CORES[val];
        return c
          ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:c.bg,color:c.text}}>{val}</span>
          : <span className="text-slate-400">—</span>;
      }
      if (col === "TEMPO DE PADRONIZAÇÃO") {
        if (!val) return <span className="text-slate-400">—</span>;
        const dias = parseInt(val);
        return <span className={`font-bold text-xs ${dias > 10 ? "text-red-600" : "text-emerald-600"}`}>{dias}d úteis</span>;
      }
      return <span className="text-slate-600">{val || "—"}</span>;
    }

    if (isEditing) {
      if (tipo === "status") return (
        <div className="flex items-center gap-1">
          <select value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
            className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={saveEdit} disabled={saving} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-3 h-3"/></button>
          <button onClick={()=>setEditCell(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3"/></button>
        </div>
      );
      if (tipo === "responsavel") return (
        <div className="flex items-center gap-1">
          <select value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
            className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">—</option>
            {RESPONSAVEIS.map(r=><option key={r}>{r}</option>)}
          </select>
          <button onClick={saveEdit} disabled={saving} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-3 h-3"/></button>
          <button onClick={()=>setEditCell(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3"/></button>
        </div>
      );
      if (tipo === "data") return (
        <div className="flex items-center gap-1">
          <input type="text" value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
            placeholder="dd/mm/aaaa"
            className="w-24 border border-blue-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          <button onClick={saveEdit} disabled={saving} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-3 h-3"/></button>
          <button onClick={()=>setEditCell(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3"/></button>
        </div>
      );
    }

    // Célula editável — exibe valor com indicador
    if (tipo === "status") {
      const c = ST_CORES[val] ?? { bg:"#f8fafc", text:"#475569", dot:"#94a3b8" };
      return (
        <span onClick={()=>startEdit(sol._linha, col, val)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity"
          style={{background:c.bg,color:c.text}} title="Clique para editar">
          <span className="w-1.5 h-1.5 rounded-full" style={{background:c.dot}}/>
          {val || "Pendente"}
        </span>
      );
    }
    return (
      <span onClick={()=>startEdit(sol._linha, col, val)}
        className="text-slate-700 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
        title="Clique para editar">
        {val || <span className="text-slate-300 italic">Editar</span>}
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardPlus className="w-5 h-5 text-blue-700"/>Solicitações
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Fonte: planilha <span className="font-mono text-blue-700">SOLICITACOES</span> · campos editáveis salvam direto na planilha
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5"/>Atualizar
          </button>
          <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
            <Download className="w-3.5 h-3.5"/>Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{concluidas}</p>
          <p className="text-xs text-slate-500 mt-0.5">Publicadas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{emAndamento}</p>
          <p className="text-xs text-slate-500 mt-0.5">Em andamento</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-2xl font-bold text-red-700">{foraPrazo}</p>
          <p className="text-xs text-slate-500 mt-0.5">Fora do prazo</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-end gap-1">
            <p className={`text-2xl font-bold ${pctConf !== null ? (pctConf >= 80 ? "text-emerald-700" : pctConf >= 50 ? "text-amber-700" : "text-red-700") : "text-slate-300"}`}>
              {pctConf !== null ? `${pctConf}%` : "—"}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Conformidade com prazo</p>
          {pctConf !== null && (
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{width:`${pctConf}%`, background: pctConf>=80?"#16a34a":pctConf>=50?"#d97706":"#dc2626"}}/>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por assunto, remetente..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={statusFiltro} onChange={e=>setStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={respFiltro} onChange={e=>setResp(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os responsáveis</option>
          {RESPONSAVEIS.map(r=><option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error && <div className="p-6 text-center text-amber-700 text-sm flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
        {loading && !error && <div className="flex items-center justify-center h-48"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>}
        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center h-48 justify-center text-slate-400">
            <ClipboardPlus className="w-10 h-10 mb-2 text-slate-200"/>
            <p className="text-sm">Nenhuma solicitação encontrada</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"1100px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {COLS_TABELA.map(h => (
                    <th key={h} className={`text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap ${EDITAVEIS[h] ? "text-blue-500" : ""}`}>
                      {h}{EDITAVEIS[h] ? " ✎" : ""}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-[10px] text-slate-400">+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((sol, i) => {
                  const isOpen = expandido === sol._linha;
                  return (
                    <>
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        {COLS_TABELA.map(col => (
                          <td key={col} className="px-3 py-3 whitespace-nowrap max-w-[180px]">
                            {col === "ASSUNTO"
                              ? <span className="font-semibold text-slate-900 truncate block max-w-[160px]">{sol[col] || "—"}</span>
                              : renderCell(sol, col)}
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <button onClick={()=>setExpandido(isOpen?null:sol._linha)}
                            className="text-slate-400 hover:text-blue-600 text-[10px] transition-colors">
                            {isOpen?"▲":"▼"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${i}-detail`}>
                          <td colSpan={COLS_TABELA.length+1} className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <p className="text-xs font-bold text-slate-600 mb-3">Detalhes</p>
                            <div className="grid grid-cols-4 gap-x-8 gap-y-2.5">
                              {COLS_DETALHE.map(col => sol[col] ? (
                                <div key={col}>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{col}</p>
                                  <p className="text-xs text-slate-800 mt-0.5">{sol[col]}</p>
                                </div>
                              ) : null)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <p className="text-xs text-slate-500">{total} solicitações · Colunas com ✎ são editáveis — clique para editar e salvar na planilha</p>
          <button onClick={exportarCSV} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
