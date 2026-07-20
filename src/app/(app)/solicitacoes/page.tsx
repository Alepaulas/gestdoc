"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Download, RefreshCw, ClipboardPlus, AlertCircle } from "lucide-react";

const STATUS_CORES: Record<string, { bg: string; text: string; dot: string }> = {
  "CONCLUÍDA":   { bg:"#f0fdf4", text:"#15803d", dot:"#16a34a" },
  "CONCLUIDA":   { bg:"#f0fdf4", text:"#15803d", dot:"#16a34a" },
  "EM ANDAMENTO":{ bg:"#eff6ff", text:"#1e40af", dot:"#2563eb" },
  "PENDENTE":    { bg:"#fffbeb", text:"#92400e", dot:"#d97706" },
  "CANCELADA":   { bg:"#f8fafc", text:"#475569", dot:"#94a3b8" },
};

// Colunas que aparecem na tabela principal (resumo)
const COLS_TABELA = [
  "ASSUNTO", "REMETENTE", "DATA DE ENVIO", "DESTINATÁRIO",
  "STATUS", "RESPONSÁVEL", "DATA DE PADRONIZAÇÃO", "DATA DE PUBLICAÇÃO",
];

// Colunas do painel de detalhes (ao expandir)
const COLS_DETALHE = [
  "E-MAIL DO SOLICITANTE", "NOME DE QUEM ESTÁ PADRONIZANDO O DOCUMENTO",
  "IMPORTADO EM", "DATA DE ENVIO PARA VALIDAÇÃO", "DATA DA VALIDAÇÃO",
  "TEMPO DE VALIDAÇÃO", "CONCLUIDA POR", "DATA DE ENVIO PARA PADRONIZAÇÃO",
  "DATA DA PADRONIZAÇÃO", "TEMPO DE PADRONIZAÇÃO", "TEMPO TOTAL",
  "PRAZO MÁXIMO PARA PADRONIZAÇÃO", "CONFORMIDADE COM O PRAZO",
  "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR",
];

export default function Solicitacoes() {
  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [statusOpts, setStatusOpts]     = useState<string[]>([]);
  const [expandido, setExpandido]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFiltro) p.set("status", statusFiltro);
    const res = await fetch(`/api/solicitacoes?${p}`);
    const json = await res.json();
    if (json.error) { setError(json.error); setLoading(false); return; }
    setData(json.solicitacoes ?? []);
    setTotal(json.total ?? 0);
    setStatusOpts(json.statusUnicos ?? []);
    setLoading(false);
  }, [search, statusFiltro]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function exportarCSV() {
    if (!data.length) return;
    const allCols = [...COLS_TABELA, ...COLS_DETALHE];
    const header = allCols;
    const rows = data.map(s => allCols.map(c => s[c] ?? ""));
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `solicitacoes_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const concluidas   = data.filter(s => s["STATUS"]?.toUpperCase().includes("CONCLU")).length;
  const emAndamento  = data.filter(s => s["STATUS"]?.toUpperCase().includes("ANDAMENTO")).length;
  const pendentes    = data.filter(s => s["STATUS"]?.toUpperCase().includes("PENDENTE")).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardPlus className="w-5 h-5 text-blue-700"/>Solicitações
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Fonte: Google Sheets · aba <span className="font-mono text-blue-700">SOLICITACOES</span>
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
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label:"Total",       value:total,      color:"text-blue-700",    bg:"bg-blue-50" },
          { label:"Concluídas",  value:concluidas,  color:"text-emerald-700", bg:"bg-emerald-50" },
          { label:"Em andamento",value:emAndamento, color:"text-blue-700",    bg:"bg-blue-50" },
          { label:"Pendentes",   value:pendentes,   color:"text-amber-700",   bg:"bg-amber-50" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por assunto, remetente, responsável..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error && (
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2"/>
            <p className="text-sm text-amber-700">{error}</p>
            {error.includes("Token") && (
              <p className="text-xs text-slate-400 mt-2">
                Faça <a href="/api/auth/signout" className="text-blue-600 underline">logout</a> e entre novamente para reconectar o Google Sheets.
              </p>
            )}
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center h-48 justify-center text-slate-400">
            <ClipboardPlus className="w-10 h-10 mb-2 text-slate-200"/>
            <p className="text-sm">Nenhuma solicitação encontrada</p>
            <p className="text-xs mt-1 text-slate-300">Verifique se a aba se chama SOLICITACOES</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:"1000px"}}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {COLS_TABELA.map(h => (
                    <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((sol, i) => {
                  const st = STATUS_CORES[sol["STATUS"]?.toUpperCase()] ?? { bg:"#f8fafc", text:"#475569", dot:"#94a3b8" };
                  const isOpen = expandido === String(sol._linha);
                  return (
                    <>
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandido(isOpen ? null : String(sol._linha))}>
                        {COLS_TABELA.map(col => (
                          <td key={col} className="px-3 py-3 whitespace-nowrap">
                            {col === "STATUS" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:st.bg,color:st.text}}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
                                {sol[col] || "—"}
                              </span>
                            ) : (
                              <span className={col === "ASSUNTO" ? "font-medium text-slate-900 max-w-[200px] truncate block" : "text-slate-600"}>
                                {sol[col] || "—"}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-slate-400 text-[10px]">{isOpen ? "▲" : "▼"}</td>
                      </tr>

                      {isOpen && (
                        <tr key={`${i}-detail`}>
                          <td colSpan={COLS_TABELA.length + 1} className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <p className="text-xs font-bold text-slate-600 mb-3">Detalhes completos</p>
                            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                              {COLS_DETALHE.map(col => (
                                sol[col] ? (
                                  <div key={col}>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{col}</p>
                                    <p className="text-xs text-slate-800 mt-0.5">{sol[col]}</p>
                                  </div>
                                ) : null
                              ))}
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
          <p className="text-xs text-slate-500">{total} solicitações · Clique em uma linha para ver detalhes completos</p>
          <button onClick={exportarCSV} className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
            <Download className="w-3 h-3"/>Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
