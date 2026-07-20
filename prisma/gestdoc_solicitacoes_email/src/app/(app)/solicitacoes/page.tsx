"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardPlus, Clock, Building2, ChevronRight, Loader2, Mail, RefreshCw } from "lucide-react";
import { ETAPA_LABELS, type Etapa } from "@/lib/solicitacaoFlow";

type Sol = {
  id: string; codigo: string; titulo: string; etapaAtual: Etapa;
  tipoRequisicao: string; tipoDocumento: string; setorSigla: string;
  createdAt: string; updatedAt: string;
  unidade: { nome: string; sigla: string } | null;
  solicitante: { name: string | null; email: string | null };
  _count: { anexos: number };
  codigoGerado: string | null;
};

type SolicitacaoEmail = {
  _linha: number;
  assunto: string;
  remetente: string;
  dataEnvio: string;
  destinatario: string;
  importadoEm: string;
  status: string;
  responsavel: string;
  dataValidacao: string;
  dataPadronizacao: string;
  dataPublicacao: string;
  tempoValidacaoDiasUteis: number | null;
  validacaoEmAndamento: boolean;
  tempoPadronizacaoDiasUteis: number | null;
  padronizacaoEmAndamento: boolean;
  conformidade: "CONFORME" | "NÃO CONFORME" | "EM PRAZO" | "ATRASADO" | "";
};

const ETAPA_COLOR: Record<string, string> = {
  ABERTA:                       "bg-amber-100 text-amber-700 border-amber-200",
  EM_ANALISE_RT:                "bg-blue-100 text-blue-700 border-blue-200",
  DEVOLVIDA_UNIDADE:            "bg-orange-100 text-orange-700 border-orange-200",
  EM_ANALISE_NUGESP:            "bg-purple-100 text-purple-700 border-purple-200",
  DEVOLVIDA_NUGESP:             "bg-red-100 text-red-700 border-red-200",
  EM_PADRONIZACAO:              "bg-indigo-100 text-indigo-700 border-indigo-200",
  AGUARDANDO_VALIDACAO_UNIDADE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  AGUARDANDO_PUBLICACAO:        "bg-violet-100 text-violet-700 border-violet-200",
  PUBLICADA:                    "bg-green-100 text-green-700 border-green-200",
  CANCELADA:                    "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_COLOR: Record<string, string> = {
  "Pendente":     "bg-amber-100 text-amber-700",
  "Em andamento": "bg-blue-100 text-blue-700",
  "Concluído":    "bg-green-100 text-green-700",
  "Cancelado":    "bg-slate-100 text-slate-500",
};

const CONFORMIDADE_COLOR: Record<string, string> = {
  "CONFORME":     "bg-green-50 text-green-700",
  "EM PRAZO":     "bg-blue-50 text-blue-700",
  "NÃO CONFORME": "bg-red-50 text-red-700",
  "ATRASADO":     "bg-red-50 text-red-700",
};

const STATUS_OPCOES = ["Pendente", "Em andamento", "Concluído", "Cancelado"];
const RESPONSAVEL_OPCOES = ["", "Rozane", "Pedro"];

function tempo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const dias = Math.floor(ms / 86400000);
  if (dias === 0) { const h = Math.floor(ms/3600000); return h === 0 ? `${Math.max(1,Math.floor(ms/60000))}min` : `${h}h`; }
  return `${dias}d`;
}

// Converte "dd/MM/yyyy" (ou "dd/MM/yyyy HH:mm") <-> "yyyy-MM-dd" (formato do <input type="date">)
function brParaInputDate(br: string): string {
  if (!br) return "";
  const [dataParte] = br.trim().split(" ");
  const [d, m, y] = dataParte.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}
function inputDateParaBr(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!d) return "";
  return `${d}/${m}/${y}`;
}

export default function SolicitacoesPage() {
  const [aba, setAba] = useState<"fluxo" | "email">("fluxo");

  // ── Fluxo interno (GestDoc) ──────────────────────────────
  const [items, setItems] = useState<Sol[] | null>(null);
  const [filtro, setFiltro] = useState<"fila"|"minhas"|"todas">("fila");

  useEffect(() => {
    if (aba !== "fluxo") return;
    setItems(null);
    fetch(`/api/solicitacoes?filtro=${filtro}`).then(r=>r.json()).then(setItems).catch(()=>setItems([]));
  }, [filtro, aba]);

  // ── Recebidas por e-mail (planilha) ──────────────────────
  const [emails, setEmails] = useState<SolicitacaoEmail[] | null>(null);
  const [erroEmails, setErroEmails] = useState("");
  const [salvandoLinha, setSalvandoLinha] = useState<number | null>(null);

  function carregarEmails() {
    setEmails(null);
    setErroEmails("");
    fetch("/api/solicitacoes-email")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErroEmails(data.error); setEmails([]); }
        else setEmails(data.itens);
      })
      .catch(() => { setErroEmails("Erro ao carregar."); setEmails([]); });
  }

  useEffect(() => { if (aba === "email") carregarEmails(); }, [aba]);

  async function salvarCampo(linha: number, campo: string, valor: string) {
    setSalvandoLinha(linha);
    // Atualização otimista na tela
    setEmails(prev => prev?.map(e => e._linha === linha ? { ...e, [campo]: valor } as SolicitacaoEmail : e) ?? prev);
    try {
      await fetch("/api/solicitacoes-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linha, [campo]: valor }),
      });
    } finally {
      carregarEmails(); // recarrega pra recalcular tempos/conformidade
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardPlus className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Solicitações</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {aba === "fluxo" ? "Fluxo: Unidade → RT → NUGESP → GestDoc → Lista Mestra" : "Solicitações recebidas por e-mail, importadas automaticamente"}
            </p>
          </div>
        </div>
        {aba === "fluxo" && (
          <Link href="/solicitacoes/nova"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
            <ClipboardPlus className="w-4 h-4"/> Nova solicitação
          </Link>
        )}
        {aba === "email" && (
          <button onClick={carregarEmails}
            className="bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
            <RefreshCw className="w-4 h-4"/> Atualizar
          </button>
        )}
      </div>

      {/* Alternador de abas */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setAba("fluxo")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${aba==="fluxo" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Fluxo interno
        </button>
        <button onClick={() => setAba("email")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${aba==="email" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <Mail className="w-3.5 h-3.5"/> Recebidas por e-mail
        </button>
      </div>

      {aba === "fluxo" && (
        <>
          {/* Filtros */}
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
            {[
              { key:"fila",   label:"Minha fila"     },
              { key:"minhas", label:"Minhas"          },
              { key:"todas",  label:"Todas"           },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro===f.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {items === null && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin"/></div>}
          {items?.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">Nenhuma solicitação encontrada.</div>}

          <div className="space-y-3">
            {items?.map(s => (
              <Link key={s.id} href={`/solicitacoes/${s.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                      {s.codigoGerado && <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">{s.codigoGerado}</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ETAPA_COLOR[s.etapaAtual]}`}>
                        {ETAPA_LABELS[s.etapaAtual]}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s.tipoRequisicao}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{s.titulo}</h3>
                    <p className="text-xs text-slate-400 mt-1">{s.tipoDocumento} · {s.setorSigla}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                      {s.unidade && <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {s.unidade.sigla}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> há {tempo(s.updatedAt)}</span>
                      <span>{s._count.anexos} anexo{s._count.anexos !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1"/>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {aba === "email" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
            Meta de padronização: <strong className="text-slate-700">10 dias úteis</strong> entre a Data de Validação e a Data de Publicação.
          </div>
          {erroEmails && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 text-sm text-amber-700">
              ⚠️ {erroEmails.includes("Token") ? "Faça logout e login novamente para reconectar o Google." : erroEmails}
            </div>
          )}
          {emails === null ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin"/></div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Nenhuma solicitação recebida por e-mail ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Assunto","Remetente","Data Solicitação","Status","Responsável","Data Validação","Tempo Validação","Data Padronização","Data Publicação","Tempo Padronização","Conformidade"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emails.map(e => (
                    <tr key={e._linha} className={`hover:bg-slate-50 transition-colors ${salvandoLinha === e._linha ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2.5 text-slate-800 font-medium max-w-[220px] truncate" title={e.assunto}>{e.assunto}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[180px] truncate" title={e.remetente}>{e.remetente}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{e.dataEnvio}</td>

                      <td className="px-3 py-2.5">
                        <select value={e.status} onChange={ev => salvarCampo(e._linha, "status", ev.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLOR[e.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {STATUS_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>

                      <td className="px-3 py-2.5">
                        <select value={e.responsavel} onChange={ev => salvarCampo(e._linha, "responsavel", ev.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 cursor-pointer bg-white">
                          {RESPONSAVEL_OPCOES.map(o => <option key={o} value={o}>{o || "— selecionar —"}</option>)}
                        </select>
                      </td>

                      <td className="px-3 py-2.5">
                        <input type="date" value={brParaInputDate(e.dataValidacao)}
                          onChange={ev => salvarCampo(e._linha, "dataValidacao", inputDateParaBr(ev.target.value))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1"/>
                      </td>

                      <td className="px-3 py-2.5 text-xs font-mono text-center whitespace-nowrap">
                        {e.tempoValidacaoDiasUteis !== null
                          ? <span className={e.validacaoEmAndamento ? "text-blue-600" : "text-slate-600"}>
                              {e.tempoValidacaoDiasUteis}d {e.validacaoEmAndamento && "(em curso)"}
                            </span>
                          : "—"}
                      </td>

                      <td className="px-3 py-2.5">
                        <input type="date" value={brParaInputDate(e.dataPadronizacao)}
                          onChange={ev => salvarCampo(e._linha, "dataPadronizacao", inputDateParaBr(ev.target.value))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1"/>
                      </td>

                      <td className="px-3 py-2.5">
                        <input type="date" value={brParaInputDate(e.dataPublicacao)}
                          onChange={ev => salvarCampo(e._linha, "dataPublicacao", inputDateParaBr(ev.target.value))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1"/>
                      </td>

                      <td className="px-3 py-2.5 text-xs font-mono text-center whitespace-nowrap">
                        {e.tempoPadronizacaoDiasUteis !== null
                          ? <span className={e.padronizacaoEmAndamento ? "text-blue-600" : "text-slate-600"}>
                              {e.tempoPadronizacaoDiasUteis}d {e.padronizacaoEmAndamento && "(em curso)"}
                            </span>
                          : "—"}
                      </td>

                      <td className="px-3 py-2.5">
                        {e.conformidade && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${CONFORMIDADE_COLOR[e.conformidade] ?? "bg-slate-100 text-slate-500"}`}>
                            {e.conformidade}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
