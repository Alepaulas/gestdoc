"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, BookOpen, CheckCircle, AlertTriangle, XCircle, ExternalLink, Loader2, Pencil, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";

type Doc = {
  _linha: number;
  localizacao: string;
  codigo: string;
  nome: string;
  dataPadronizacao: string;
  unidade: string;
  proximaRevisao: string;
  diasVencimento: string;
  status: string;
  statusDocumento: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  VIGENTE:  { label: "Vigente",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  icon: CheckCircle  },
  VENCENDO: { label: "Vencendo", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: AlertTriangle },
  VENCIDO:  { label: "Vencido",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: XCircle      },
};

const STATUS_DOCUMENTO_OPTIONS = ["VIGENTE", "EM REVISÃO", "OBSOLETO", "SUSPENSO", "CANCELADO"];

const STATUS_DOC_COLOR: Record<string, string> = {
  "VIGENTE":    "bg-green-100 text-green-700",
  "EM REVISÃO": "bg-blue-100 text-blue-700",
  "OBSOLETO":   "bg-slate-100 text-slate-500",
  "SUSPENSO":   "bg-amber-100 text-amber-700",
  "CANCELADO":  "bg-red-100 text-red-700",
};

export default function PublicadosPage() {
  const { data: session } = useSession();
  const papel = (session?.user as any)?.papelFluxo as string;
  const role  = (session?.user as any)?.role as string;
  const podeEditar = papel === "GESTDOC" || role === "ADMIN";

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [editando, setEditando] = useState<{ linha: number; valor: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (busca)        params.set("busca", busca);
      if (filtroStatus) params.set("status", filtroStatus);
      const res = await fetch(`/api/publicados?${params}`);
      const j = await res.json();
      if (j.error) setError(j.error);
      else setDocs(j.docs ?? []);
    } catch { setError("Erro ao carregar."); }
    finally { setLoading(false); }
  }, [busca, filtroStatus]);

  useEffect(() => { load(); }, [load]);

  async function salvarStatus() {
    if (!editando) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/publicados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linha: editando.linha, statusDocumento: editando.valor }),
      });
      if (res.ok) {
        setDocs(prev => prev.map(d => d._linha === editando.linha ? { ...d, statusDocumento: editando.valor } : d));
        setEditando(null);
      }
    } finally { setSalvando(false); }
  }

  const totais = {
    total:    docs.length,
    vigente:  docs.filter(d => d.status?.toUpperCase() === "VIGENTE").length,
    vencendo: docs.filter(d => d.status?.toUpperCase() === "VENCENDO").length,
    vencido:  docs.filter(d => d.status?.toUpperCase() === "VENCIDO").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentos Publicados</h1>
          <p className="text-slate-500 text-xs mt-0.5">Cópia controlada — aba PUBLICADOS</p>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",    value: totais.total,    color: "text-slate-700", bg: "bg-slate-50 border-slate-200"  },
          { label: "Vigentes", value: totais.vigente,  color: "text-green-700", bg: "bg-green-50 border-green-200"  },
          { label: "Vencendo", value: totais.vencendo, color: "text-amber-700", bg: "bg-amber-50 border-amber-200"  },
          { label: "Vencidos", value: totais.vencido,  color: "text-red-700",   bg: "bg-red-50   border-red-200"    },
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
            placeholder="Buscar por nome, código ou setor..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Todos os status</option>
          <option value="VIGENTE">Vigente</option>
          <option value="VENCENDO">Vencendo</option>
          <option value="VENCIDO">Vencido</option>
        </select>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin"/></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300"/>
          Nenhum documento publicado encontrado.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Localização","Código","Nome","Padronização","Unidade","Próx. Revisão","Dias","Validade","Status Doc."].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                  {podeEditar && <th className="px-4 py-3 text-xs font-semibold text-slate-600">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => {
                  const sv = STATUS_CONFIG[doc.status?.toUpperCase()] ?? STATUS_CONFIG["VIGENTE"];
                  const Icon = sv.icon;
                  const dias = parseInt(doc.diasVencimento);
                  const isEditando = editando?.linha === doc._linha;

                  return (
                    <tr key={doc._linha} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.localizacao}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">{doc.codigo}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{doc.nome}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.dataPadronizacao}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.unidade}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{doc.proximaRevisao}</td>
                      <td className="px-4 py-3 text-xs font-mono text-center">
                        {doc.diasVencimento
                          ? <span className={!isNaN(dias) && dias < 0 ? "text-red-600 font-bold" : !isNaN(dias) && dias <= 60 ? "text-amber-600 font-bold" : "text-slate-500"}>
                              {doc.diasVencimento}
                            </span>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-xs font-semibold ${sv.text}`}>
                          <Icon className="w-3.5 h-3.5"/>{sv.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditando ? (
                          <div className="flex items-center gap-1">
                            <select value={editando.valor} onChange={e => setEditando({ ...editando, valor: e.target.value })}
                              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
                              {STATUS_DOCUMENTO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={salvarStatus} disabled={salvando}
                              className="text-green-600 hover:text-green-800">
                              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
                            </button>
                            <button onClick={() => setEditando(null)} className="text-red-400 hover:text-red-600">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_DOC_COLOR[doc.statusDocumento] ?? "bg-slate-100 text-slate-500"}`}>
                            {doc.statusDocumento || "—"}
                          </span>
                        )}
                      </td>
                      {podeEditar && (
                        <td className="px-4 py-3">
                          {!isEditando && (
                            <button onClick={() => setEditando({ linha: doc._linha, valor: doc.statusDocumento || "VIGENTE" })}
                              className="text-slate-400 hover:text-blue-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </td>
                      )}
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
