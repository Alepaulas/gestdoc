"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { UNIDADES } from "@/lib/unidades";

type Doc = {
  _linha: number;
  id: string;
  tipoDocumento: string;
  codigo: string;
  titulo: string;
  unidade: string;
  setor: string;
  statusDemanda: string;
  statusDocumento: string;
  vigencia: string;
  dataSolicitacao: string;
  dataPadronizacao: string;
  dataProximaRevisao: string;
  versao: string;
  revisao: string;
  dataPublicacao: string;
  diasVencimento: number | null;
  statusValidade: string;
  conformidadePrazo: string;
  concluidaPor: string;
};

const STATUS_VALIDADE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  VIGENTE:  { label: "Vigente",  bg: "bg-green-50",  text: "text-green-700",  icon: CheckCircle  },
  VENCENDO: { label: "Vencendo", bg: "bg-amber-50",  text: "text-amber-700",  icon: AlertTriangle },
  VENCIDO:  { label: "Vencido",  bg: "bg-red-50",    text: "text-red-700",    icon: XCircle      },
};

const STATUS_DEMANDA_COLOR: Record<string, string> = {
  "Em andamento": "bg-blue-100 text-blue-700",
  "Concluída":    "bg-green-100 text-green-700",
  "Cancelada":    "bg-red-100 text-red-700",
  "Pendente":     "bg-amber-100 text-amber-700",
};

export default function ListaMestraPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search)        params.set("search", search);
      if (filtroStatus)  params.set("status", filtroStatus);
      if (filtroUnidade) params.set("unidade", filtroUnidade);
      const res = await fetch(`/api/lista-mestra?${params}`);
      const j = await res.json();
      if (j.error) setError(j.error);
      else setDocs(j.docs ?? []);
    } catch { setError("Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search, filtroStatus, filtroUnidade]);

  async function sincronizar() {
    setSyncing(true);
    await fetch("/api/sheets", { method: "POST" }).catch(() => {});
    await load();
    setSyncing(false);
  }

  const totais = {
    total:    docs.length,
    vigente:  docs.filter(d => d.statusValidade === "VIGENTE").length,
    vencendo: docs.filter(d => d.statusValidade === "VENCENDO").length,
    vencido:  docs.filter(d => d.statusValidade === "VENCIDO").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lista Mestra</h1>
          <p className="text-slate-500 text-sm mt-1">Controle de documentos conforme Norma Zero ISGH</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sincronizar} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}/>
            Sincronizar
          </button>
          <Link href="/documentos/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4"/> Novo documento
          </Link>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: totais.total, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Vigentes", value: totais.vigente, color: "text-green-700", bg: "bg-green-50 border-green-200" },
          { label: "Vencendo", value: totais.vencendo, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Vencidos", value: totais.vencido, color: "text-red-700", bg: "bg-red-50 border-red-200" },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por título ou código..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
        </div>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Todos os status</option>
          <option value="VIGENTE">Vigente</option>
          <option value="VENCENDO">Vencendo</option>
          <option value="VENCIDO">Vencido</option>
        </select>
        <select value={filtroUnidade} onChange={e=>setFiltroUnidade(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-48">
          <option value="">Todas as unidades</option>
          {UNIDADES.map(u => (
            <option key={u.sigla} value={u.sigla}>{u.sigla}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          ⚠️ {error.includes("Token") ? "Faça logout e login novamente para reconectar o Google." : error}
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Nenhum documento encontrado.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["ID","Código","Título","Unidade","Setor","Status Demanda","Validade","Dias","Próx. Revisão","Versão","Publicado em"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => {
                  const sv = STATUS_VALIDADE_CONFIG[doc.statusValidade] ?? STATUS_VALIDADE_CONFIG["VIGENTE"];
                  const Icon = sv.icon;
                  return (
                    <tr key={doc._linha} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">{doc.id}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">{doc.codigo}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{doc.titulo}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{doc.unidade}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{doc.setor}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_DEMANDA_COLOR[doc.statusDemanda] ?? "bg-slate-100 text-slate-500"}`}>
                          {doc.statusDemanda}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-xs font-semibold ${sv.text}`}>
                          <Icon className="w-3.5 h-3.5"/>
                          {sv.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-center">
                        {doc.diasVencimento !== null
                          ? <span className={doc.diasVencimento < 0 ? "text-red-600 font-bold" : doc.diasVencimento <= 60 ? "text-amber-600 font-bold" : "text-slate-500"}>
                              {doc.diasVencimento}
                            </span>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.dataProximaRevisao}</td>
                      <td className="px-4 py-3 text-xs font-mono text-center text-slate-600">{doc.versao}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.dataPublicacao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
