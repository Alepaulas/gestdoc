"use client";
import { useEffect, useState } from "react";
import { Shield, Bell, HardDrive, Play, CheckCircle, RefreshCw, Table, Plus, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { UNIDADES } from "@/lib/unidades";

export default function Configuracoes() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [users, setUsers] = useState<any[]>([]);
  const [alertResult, setAlertResult] = useState<any>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<any>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({ email: "", nome: "", papel: "", unidade: "" });
  const [showForm, setShowForm] = useState(false);

  async function loadUsers() {
    if (!isAdmin) return;
    fetch("/api/users").then(r=>r.json()).then(d => {
      if (Array.isArray(d)) setUsers(d);
    }).catch(()=>{});
  }

  useEffect(() => { loadUsers(); }, [isAdmin]);

  async function salvarUsuario() {
    if (!novoUsuario.email || !novoUsuario.papel) return;
    setSavingUser(true);
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoUsuario),
    });
    setNovoUsuario({ email: "", nome: "", papel: "", unidade: "" });
    setShowForm(false);
    await loadUsers();
    setSavingUser(false);
  }

  async function removerUsuario(email: string) {
    if (!confirm(`Remover ${email}?`)) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await loadUsers();
  }

  async function alterarCampo(email: string, campo: string, valor: string) {
    const u = users.find(x => x.email === email);
    if (!u) return;
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, [campo]: valor }),
    });
    setUsers(prev => prev.map(x => x.email === email ? { ...x, [campo]: valor } : x));
  }

  async function runAlertas() {
    setAlertLoading(true); setAlertResult(null);
    const r = await fetch("/api/alertas", { method: "POST" });
    setAlertResult(await r.json());
    setAlertLoading(false);
  }

  async function syncSheets() {
    setSheetsLoading(true); setSheetsResult(null);
    const r = await fetch("/api/sheets", { method: "POST" });
    const d = await r.json();
    setSheetsResult(d);
    setSheetsLoading(false);
  }

  const PAPEL_COLORS: Record<string,string> = {
    ADMIN: "bg-red-100 text-red-700",
    GESTDOC: "bg-indigo-100 text-indigo-700",
    NUGESP: "bg-purple-100 text-purple-700",
    REFERENCIA_TECNICA: "bg-blue-100 text-blue-700",
    UNIDADE: "bg-green-100 text-green-700",
    OPERACIONAL: "bg-amber-100 text-amber-700",
  };
    VIEWER: "bg-slate-100 text-slate-600",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Integrações e controle de acesso</p>
      </div>
      <div className="space-y-5">

        {/* Google Sheets */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-600"/>
            Google Sheets — Lista Mestra
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Toda vez que um documento é cadastrado ou atualizado no sistema, a planilha é atualizada automaticamente. Você também pode sincronizar manualmente.
          </p>
          <div className="flex gap-3 flex-wrap">
            {isAdmin && (
              <button
                onClick={syncSheets}
                disabled={sheetsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sheetsLoading?"animate-spin":""}`}/>
                {sheetsLoading ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            )}
          </div>
          {sheetsResult && (
            <div className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${sheetsResult.error ? "bg-red-50 border border-red-100 text-red-700" : "bg-emerald-50 border border-emerald-100 text-emerald-700"}`}>
              {sheetsResult.error
                ? <><span>❌</span> {sheetsResult.error} {sheetsResult.hint && <span className="text-xs ml-1">({sheetsResult.hint})</span>}</>
                : <><CheckCircle className="w-4 h-4"/>{sheetsResult.sincronizados} documentos sincronizados com a planilha</>
              }
            </div>
          )}
        </div>

        {/* Integrações */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600"/>
            Integrações ativas
          </h2>
          {[
            { icon:"🟢", name:"Google Sheets", desc:"Lista Mestra sincronizada automaticamente" },
            { icon:"🟦", name:"Google Drive", desc:"Links de arquivos .docx e .pdf" },
            { icon:"📧", name:"Gmail", desc:"Alertas automáticos de vencimento" },
          ].map(i => (
            <div key={i.name} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-3 last:mb-0">
              <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-lg">{i.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-900">{i.name}</p>
                <p className="text-xs text-slate-500">{i.desc}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Ativo</span>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500"/>
              Alertas automáticos
            </h2>
            <p className="text-sm text-slate-500 mb-4">Vercel Cron executa diariamente às 08h. Execute manualmente a qualquer momento:</p>
            <button onClick={runAlertas} disabled={alertLoading} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
              <Play className="w-4 h-4"/>
              {alertLoading ? "Executando..." : "Verificar agora"}
            </button>
            {alertResult && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {alertResult.processados} documentos verificados · {alertResult.atualizados} atualizados
              </div>
            )}
          </div>
        )}

        {/* Usuários — gerenciados pela aba USUARIOS da planilha */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600"/>
                Controle de acesso
              </h2>
              <button onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5"/> Adicionar usuário
              </button>
            </div>

            {/* Formulário de novo usuário */}
            {showForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Novo usuário</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email *</label>
                    <input value={novoUsuario.email} onChange={e => setNovoUsuario(p=>({...p,email:e.target.value}))}
                      placeholder="usuario@isgh.org.br"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nome</label>
                    <input value={novoUsuario.nome} onChange={e => setNovoUsuario(p=>({...p,nome:e.target.value}))}
                      placeholder="Nome completo"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Papel *</label>
                    <select value={novoUsuario.papel} onChange={e => setNovoUsuario(p=>({...p,papel:e.target.value}))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                      <option value="">Selecione...</option>
                      <option value="ADMIN">Admin</option>
                      <option value="GESTDOC">GestDoc</option>
                      <option value="NUGESP">NUGESP</option>
                      <option value="REFERENCIA_TECNICA">Referência Técnica</option>
                      <option value="UNIDADE">Unidade</option>
                      <option value="OPERACIONAL">Operacional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Unidade</label>
                    <select value={novoUsuario.unidade} onChange={e => setNovoUsuario(p=>({...p,unidade:e.target.value}))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                      <option value="">Sem unidade</option>
                      {UNIDADES.map(u => <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={salvarUsuario} disabled={savingUser}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                    {savingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5"/>}
                    Salvar
                  </button>
                  <button onClick={() => setShowForm(false)} className="text-slate-500 text-xs px-3 py-2 hover:text-slate-700">Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista de usuários */}
            {users.length === 0
              ? <p className="text-xs text-slate-400 text-center py-6">Nenhum usuário cadastrado ainda.<br/>Adicione o primeiro usuário acima.</p>
              : (
              <div className="space-y-2">
                {users.filter(u => u.email).map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                      {(u.nome || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.nome || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAPEL_COLORS[u.papel] ?? "bg-slate-100 text-slate-500"}`}>
                      {u.papel}
                    </span>
                    <select value={u.papel} onChange={e => alterarCampo(u.email, "papel", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                      <option value="ADMIN">Admin</option>
                      <option value="GESTDOC">GestDoc</option>
                      <option value="NUGESP">NUGESP</option>
                      <option value="REFERENCIA_TECNICA">Ref. Técnica</option>
                      <option value="UNIDADE">Unidade</option>
                      <option value="OPERACIONAL">Operacional</option>
                    </select>
                    <select value={u.unidade} onChange={e => alterarCampo(u.email, "unidade", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-32">
                      <option value="">Sem unidade</option>
                      {UNIDADES.map(un => <option key={un.sigla} value={un.sigla}>{un.sigla}</option>)}
                    </select>
                    <button onClick={() => removerUsuario(u.email)}
                      className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">💡 Usuários gerenciados na aba <strong>USUARIOS</strong> da planilha Lista Mestra.</p>
          </div>
        )}
      </div>
    </div>
  );
}
