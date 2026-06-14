"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileText, CheckCircle, Clock, AlertTriangle, ChevronRight, Calendar } from "lucide-react";

const ST: Record<string,{label:string;bg:string;text:string;dot:string}> = {
  VIGENTE:  {label:"Vigente",  bg:"#f0fdf4",text:"#15803d",dot:"#16a34a"},
  VENCENDO: {label:"Vencendo", bg:"#fffbeb",text:"#92400e",dot:"#d97706"},
  VENCIDO:  {label:"Vencido",  bg:"#fef2f2",text:"#991b1b",dot:"#dc2626"},
};

export default function Home() {
  const { data: session } = useSession();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/lista-mestra")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setDocs(d.docs ?? []);
        setLoading(false);
      });
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const total = docs.length;
  const vigentes = docs.filter(d => d.status === "VIGENTE").length;
  const vencendo = docs.filter(d => d.status === "VENCENDO").length;
  const vencidos = docs.filter(d => d.status === "VENCIDO").length;
  const alertas = docs.filter(d => d.status === "VENCENDO" || d.status === "VENCIDO").slice(0, 8);

  // Agrupa por tipo
  const porTipo: Record<string, number> = {};
  docs.forEach(d => {
    const tipo = d.tipo?.split("—")[0]?.trim() || d.tipo || "Outros";
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });

  const stats = [
    { label:"Total de documentos", value:total,    icon:FileText,     color:"text-blue-700",    bg:"bg-blue-50" },
    { label:"Vigentes",            value:vigentes,  icon:CheckCircle,  color:"text-emerald-700", bg:"bg-emerald-50" },
    { label:"Vencendo",            value:vencendo,  icon:Clock,        color:"text-amber-700",   bg:"bg-amber-50" },
    { label:"Vencidos",            value:vencidos,  icon:AlertTriangle,color:"text-red-700",     bg:"bg-red-50" },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-900">{saudacao}, {session?.user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Painel de governança documental — ISGH</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-700">
          ⚠️ {error.includes("Token") ? "Faça logout e entre novamente para reconectar o Google Sheets." : error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-7">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`}/>
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500"/>Alertas de revisão
                </h2>
                <Link href="/documentos/lista-mestra?status=VENCENDO" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todos<ChevronRight className="w-3 h-3"/>
                </Link>
              </div>
              {alertas.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <CheckCircle className="w-10 h-10 mb-2 text-emerald-300"/>
                  <p className="text-sm">Nenhum alerta no momento</p>
                </div>
              ) : alertas.map((doc, i) => {
                const st = ST[doc.status] ?? ST.VIGENTE;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.status==="VENCIDO"?"bg-red-100":"bg-amber-100"}`}>
                      <FileText className={`w-3.5 h-3.5 ${doc.status==="VENCIDO"?"text-red-600":"text-amber-600"}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{doc.titulo}</p>
                      <p className="text-xs text-slate-500 truncate">{doc.unidade} · {doc.area}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:st.bg,color:st.text}}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{background:st.dot}}/>
                        {st.label}
                      </span>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3"/>{doc.dataRevisao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="font-bold text-slate-900 mb-4 text-sm">Por tipo</h2>
                {Object.entries(porTipo).slice(0,8).map(([tipo, count]) => {
                  const pct = total > 0 ? Math.round((count/total)*100) : 0;
                  return (
                    <div key={tipo} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600 truncate max-w-[120px]">{tipo}</span>
                        <span className="text-xs font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-800 mb-1">Lista Mestra</p>
                <p className="text-xs text-blue-600 mb-3">Controle conforme Norma Zero ISGH</p>
                <Link href="/documentos/lista-mestra" className="block text-center bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-800 transition-colors">
                  Abrir Lista Mestra →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
