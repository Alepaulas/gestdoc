"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader } from "lucide-react";

function ConfirmarContent() {
  const sp = useSearchParams();
  const token = sp.get("token");
  const [state, setState] = useState<"loading"|"ok"|"already"|"error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMsg("Token inválido"); return; }
    fetch("/api/leitura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success || d.already) { setState(d.already ? "already" : "ok"); setMsg(d.message || "Leitura confirmada!"); }
        else { setState("error"); setMsg(d.error || "Erro ao confirmar"); }
      })
      .catch(() => { setState("error"); setMsg("Erro de conexão"); });
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
      {state === "loading" && <><Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4"/><p className="text-slate-600">Confirmando leitura...</p></>}
      {state === "ok" && <><CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4"/><h1 className="text-xl font-bold text-slate-900 mb-2">Leitura confirmada!</h1><p className="text-slate-500 text-sm">Seu registro foi salvo no audit log para fins de conformidade ONA.</p></>}
      {state === "already" && <><CheckCircle className="w-16 h-16 text-slate-400 mx-auto mb-4"/><h1 className="text-xl font-bold text-slate-900 mb-2">Já confirmado</h1><p className="text-slate-500 text-sm">Você já havia confirmado a leitura deste documento anteriormente.</p></>}
      {state === "error" && <><XCircle className="w-16 h-16 text-red-500 mx-auto mb-4"/><h1 className="text-xl font-bold text-slate-900 mb-2">Erro</h1><p className="text-slate-500 text-sm">{msg}</p></>}
    </div>
  );
}

export default function ConfirmarLeitura() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4"/>
          <p className="text-slate-600">Carregando...</p>
        </div>
      }>
        <ConfirmarContent />
      </Suspense>
    </div>
  );
}
