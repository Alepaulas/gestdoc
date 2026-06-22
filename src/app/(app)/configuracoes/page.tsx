"use client";
import { useEffect, useState } from "react";
import { Shield, Bell, HardDrive, Play, CheckCircle, RefreshCw, Table } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Configuracoes() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [users, setUsers] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [alertResult, setAlertResult] = useState<any>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<any>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users").then(r=>r.json()).then(setUsers);
      fetch("/api/unidades").then(r=>r.json()).then(setUnidades).catch(()=>setUnidades([]));
    }
  }, [isAdmin]);

  async function changeRole(userId: string, role: string) {
    await fetch("/api/users", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId,role}) });
    setUsers(u => u.map(x => x.id===userId ? {...x,role} : x));
  }

  async function changeFluxo(userId: string, field: "unidadeId" | "papelFluxo", value: string) {
    await fetch("/api/users", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId,[field]:value}) });
    setUsers(u => u.map(x => x.id===userId ? {...x,[field]:value || null} : x));
  }

  async function runAlertas() {
    setAlertLoading(true); setAlertResult(null);
    const r = await fetch("/api/alertas", { method:"POST" });
    setAlertResult(await r.json());
    setAlertLoading(false);
  }

  async function syncSheets() {
    setSheetsLoading(true); setSheetsResult(null);
    const r = await fetch("/api/sheets", { method:"POST" });
    const d = await r.json();
    setSheetsResult(d);
    setSheetsLoading(false);
  }

  const ROLE_COLORS: Record<string,string> = {
    ADMIN: "bg-red-100 text-red-700",
    EDITOR: "bg-blue-100 text-blue-700",
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

        {/* Usuários */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600"/>
              Controle de acesso
            </h2>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  {u.image
                    ? <img src={u.image} className="w-8 h-8 rounded-full" alt=""/>
                    : <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">{u.name?.[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <select
                    value={u.unidadeId ?? ""}
                    onChange={e => changeFluxo(u.id, "unidadeId", e.target.value)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem unidade</option>
                    {unidades.map((un:any) => (
                      <option key={un.id} value={un.id}>{un.sigla}</option>
                    ))}
                  </select>
                  <select
                    value={u.papelFluxo ?? ""}
                    onChange={e => changeFluxo(u.id, "papelFluxo", e.target.value)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem papel no fluxo</option>
                    <option value="UNIDADE">Unidade</option>
                    <option value="REFERENCIA_TECNICA">Referência Técnica</option>
                    <option value="GESTDOC">GestDoc</option>
                    <option value="OPERACIONAL">Operacional</option>
                  </select>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${ROLE_COLORS[u.role]}`}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Visualizador</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
