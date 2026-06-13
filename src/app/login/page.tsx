"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FileText, Shield, Bell, Users, AlertTriangle } from "lucide-react";

export default function Login() {
  const params = useSearchParams();
  const error = params.get("error");
  const isDomainError = error === "DomainNotAllowed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5"/></div>
          <span className="font-bold text-xl">GestDoc</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-4">Gestão Documental<br/><span className="text-blue-400">com conformidade ONA</span></h1>
          <p className="text-slate-400 text-lg mb-10">Mapa de conformidade automático, fluxo de aprovação, leitura obrigatória e geração de Word — tudo integrado.</p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: FileText, t: "Documentos centralizados", d: "POP, PR, IT, FM, MN, PT" },
              { icon: Shield, t: "Mapa ONA em tempo real", d: "Status calculado automaticamente" },
              { icon: Bell, t: "Alertas automáticos", d: "Gmail + Cron diário" },
              { icon: Users, t: "Fluxo de aprovação", d: "Elaborador → Revisor → Aprovador" },
            ].map(f => (
              <div key={f.t} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-blue-400"/>
                </div>
                <div><p className="font-semibold text-sm">{f.t}</p><p className="text-slate-400 text-xs">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">© {new Date().getFullYear()} GestDoc</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Bem-vinda</h2>
              <p className="text-slate-500 text-sm">Entre com sua conta institucional Google</p>
            </div>

            {isDomainError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-semibold text-red-800">Acesso negado</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Este sistema aceita apenas contas do domínio institucional.
                    Use seu e-mail corporativo para entrar.
                  </p>
                </div>
              </div>
            )}

            {error && !isDomainError && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700">Ocorreu um erro na autenticação. Tente novamente.</p>
              </div>
            )}

            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </button>

            <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl">
              <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
              <p className="text-xs text-slate-400">
                Acesso restrito ao domínio institucional configurado em <code className="text-slate-500">ALLOWED_DOMAINS</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
