"use client";
import { useEffect, useState } from "react";
import { Search, Package, CheckCircle, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { UNIDADES } from "@/lib/unidades";

type Doc = {
  _linha: number;
  id: string;
  tipoDocumento: string;
  nivel: string;
  codigo: string;
  titulo: string;
  unidade: string;
  setor: string;
  statusDemanda: string;
  statusDocumento: string;
  vigencia: string;
  dataPadronizacao: string;
  dataProximaRevisao: string;
  versao: string;
  revisao: string;
  dataPublicacao: string;
  diasVencimento: number | null;
  statusValidade: string;
  elaborador: string;
  aprovador: string;
  linkEmail: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  VIGENTE:  { label: "Vigente",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", icon: CheckCircle  },
  VENCENDO: { label: "Vencendo", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: AlertTriangle },
  VENCIDO:  { label: "Vencido",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   icon: XCircle      },
};

const NIVEL_COLOR: Record<string, string> = {
  "Nível I":   "bg-purple-100 text-purple-700",
  "Nível II":  "bg-blue-100 text-blue-700",
  "Nível III": "bg-slate-100 text-slate-600",
};

export default function InventarioPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [unidadeAtual, setUnidadeAtual] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [docSelecionado, setDocSelecionado] = useState<Doc | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (busca)         params.set("busca", busca);
      if (filtroStatus)  params.set("status", filtroStatus);
      if (unidadeFiltro) params.set("unidade", unidadeFiltro);
      const res = await fetch(`/api/inventario?${params}`);
      const j = await res.json();
      if (j.error) setError(j.error);
      else {
        setDocs(j.docs ?? []);
        setIsAdmin(j.isAdmin ?? false);
        setUnidadeAtual(j.unidadeFiltro ?? "");
      }
    } catch { setError("Erro ao carregar inventário."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [busca, filtroStatus, unidadeFiltro]);

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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventário de Documentos</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {unidadeAtual
                ? `Exibindo documentos da área: ${unidadeAtual}`
                : "Todos os documentos"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",     value: totais.total,    color: "text-slate-700",  bg: "bg-slate-50  border-slate-200"  },
          { label: "Vigentes",  value: totais.vigente,  color: "text-green-700",  bg: "bg-green-50  border-green-200"  },
          { label: "Vencendo",  value: totais.vencendo, color: "text-amber-700",  bg: "bg-amber-50  border-amber-200"  },
          { label: "Vencidos",  value: totais.vencido,  color: "text-red-700",    bg: "bg-red-50    border-red-200"    },
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
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título, código ou tipo..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Todos os status</option>
          <option value="VIGENTE">Vigente</option>
          <option value="VENCENDO">Vencendo</option>
          <option value="VENCIDO">Vencido</option>
        </select>
        {isAdmin && (
          <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-52">
            <option value="">Todas as unidades</option>
            {UNIDADES.map(u => (
              <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          ⚠️ {error.includes("Token") ? "Faça logout e login novamente para reconectar o Google." : error}
        </div>
      )}

      {/* Lista de documentos */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">Nenhum documento encontrado para esta área.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {docs.map(doc => {
            const sv = STATUS_CONFIG[doc.statusValidade] ?? STATUS_CONFIG["VIGENTE"];
            const Icon = sv.icon;
            return (
              <div key={doc._linha}
                onClick={() => setDocSelecionado(doc)}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700">{doc.codigo}</span>
                      {doc.nivel && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${NIVEL_COLOR[doc.nivel] ?? "bg-slate-100 text-slate-500"}`}>
                          {doc.nivel}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${sv.bg} ${sv.text} ${sv.border}`}>
                        <Icon className="w-3 h-3"/> {sv.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{doc.titulo}</h3>
                    <p className="text-xs text-slate-400 mt-1">{doc.tipoDocumento}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Próx. revisão</p>
                    <p className={`text-sm font-semibold ${
                      doc.diasVencimento !== null && doc.diasVencimento < 0 ? "text-red-600" :
                      doc.diasVencimento !== null && doc.diasVencimento <= 60 ? "text-amber-600" : "text-slate-700"
                    }`}>{doc.dataProximaRevisao || "—"}</p>
                    {doc.diasVencimento !== null && (
                      <p className="text-xs text-slate-400">{doc.diasVencimento} dias</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <span>📍 {doc.unidade} — {doc.setor}</span>
                  <span>📅 Publicado: {doc.dataPublicacao || "—"}</span>
                  <span>🔖 Versão {doc.versao}</span>
                  {doc.elaborador && <span>✍️ {doc.elaborador}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhe */}
      {docSelecionado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDocSelecionado(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700">{docSelecionado.codigo}</span>
                <h2 className="text-lg font-bold text-slate-800 mt-1">{docSelecionado.titulo}</h2>
              </div>
              <button onClick={() => setDocSelecionado(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: "Tipo",             value: docSelecionado.tipoDocumento },
                { label: "Nível",            value: docSelecionado.nivel },
                { label: "Unidade",          value: docSelecionado.unidade },
                { label: "Setor",            value: docSelecionado.setor },
                { label: "Versão",           value: docSelecionado.versao },
                { label: "Revisão",          value: docSelecionado.revisao },
                { label: "Vigência",         value: docSelecionado.vigencia },
                { label: "Data Publicação",  value: docSelecionado.dataPublicacao },
                { label: "Data Padronização",value: docSelecionado.dataPadronizacao },
                { label: "Próxima Revisão",  value: docSelecionado.dataProximaRevisao },
                { label: "Dias p/ Vencimento", value: docSelecionado.diasVencimento !== null ? `${docSelecionado.diasVencimento} dias` : "—" },
                { label: "Status",           value: docSelecionado.statusValidade },
                { label: "Elaborador(es)",   value: docSelecionado.elaborador },
                { label: "Aprovador",        value: docSelecionado.aprovador },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex-shrink-0">{row.label}</span>
                  <span className="text-slate-800 text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {docSelecionado.linkEmail && (
              <a href={docSelecionado.linkEmail} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <ExternalLink className="w-4 h-4"/> Abrir documento
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
