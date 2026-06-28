"use client";
import { useEffect, useState, useRef } from "react";
import { Bell, AlertTriangle, XCircle, X, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

type Notificacao = {
  codigo: string;
  titulo: string;
  diasVencimento: number | null;
  dataProximaRevisao: string;
  unidade: string;
  status: string;
};

export function SinoNotificacoes() {
  const { data: session } = useSession();
  const papel = (session?.user as any)?.papelFluxo as string;
  const role  = (session?.user as any)?.role as string;

  const papeisPermitidos = ["UNIDADE", "GESTDOC", "ADMIN"];
  const deveExibir = papeisPermitidos.includes(papel) || role === "ADMIN";

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [total, setTotal] = useState(0);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deveExibir) return;
    fetch("/api/notificacoes")
      .then(r => r.json())
      .then(j => {
        setNotificacoes(j.notificacoes ?? []);
        setTotal(j.total ?? 0);
      })
      .catch(() => {});
  }, [deveExibir]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!deveExibir) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAberto(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5 text-slate-500"/>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Notificações</h3>
            <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4"/>
            </button>
          </div>

          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 mb-2 text-green-400"/>
              <p className="text-sm">Tudo em dia! Nenhum documento vencendo.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notificacoes.map((n, i) => (
                <div key={i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    {n.diasVencimento !== null && n.diasVencimento < 0
                      ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                      : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{n.titulo}</p>
                      <p className="text-xs font-mono text-indigo-600">{n.codigo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.diasVencimento !== null && n.diasVencimento < 0
                          ? <span className="text-xs font-semibold text-red-600">Vencido há {Math.abs(n.diasVencimento)} dias</span>
                          : <span className="text-xs font-semibold text-amber-600">Vence em {n.diasVencimento} dias</span>
                        }
                        {n.unidade && <span className="text-xs text-slate-400">· {n.unidade}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Revisão: {n.dataProximaRevisao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-slate-100">
            <a href="/documentos/lista-mestra" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Ver Lista Mestra completa →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
