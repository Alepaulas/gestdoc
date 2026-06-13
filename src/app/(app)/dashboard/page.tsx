"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileText, CheckCircle, Clock, AlertTriangle, Calendar, ChevronRight, BookOpen, ThumbsUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, diasRestantes } from "@/lib/utils";

export default function Dashboard() {
  const { data: session } = useSession();
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/dashboard").then(r=>r.json()).then(setD); }, []);
  const hora = new Date().getHours();
  const saudacao = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  if (!d) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  const stats = [
    { label:"Total", value:d.total, icon:FileText, color:"text-blue-600", bg:"bg-blue-50" },
    { label:"Vigentes", value:d.vigentes, icon:CheckCircle, color:"text-emerald-600", bg:"bg-emerald-50" },
    { label:"Vencendo", value:d.vencendo, icon:Clock, color:"text-amber-600", bg:"bg-amber-50" },
    { label:"Vencidos", value:d.vencidos, icon:AlertTriangle, color:"text-red-600", bg:"bg-red-50" },
    { label:"Aprovações", value:d.aprovacoesPendentes, icon:ThumbsUp, color:"text-purple-600", bg:"bg-purple-50" },
    { label:"Leituras pendentes", value:d.leiturasNaoConfirmadas, icon:BookOpen, color:"text-indigo-600", bg:"bg-indigo-50" },
  ];
  return (
    <div>
      <div className="mb-7"><h1 className="text-2xl font-bold text-slate-900">{saudacao}, {session?.user?.name?.split(" ")[0]}! 👋</h1><p className="text-slate-500 text-sm mt-1">Resumo da gestão documental de hoje.</p></div>
      <div className="grid grid-cols-3 gap-4 mb-7">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`}/></div>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/>Alertas de revisão</h2><Link href="/documentos?status=VENCENDO" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Ver todos<ChevronRight className="w-3 h-3"/></Link></div>
          {d.alertas.length===0 ? <div className="flex flex-col items-center py-8 text-slate-400"><CheckCircle className="w-10 h-10 mb-2 text-emerald-300"/><p className="text-sm">Nenhum alerta no momento</p></div>
          : d.alertas.map((doc: any) => { const dias = diasRestantes(doc.dataRevisao); return (
            <Link key={doc.id} href={`/documentos/${doc.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${dias<0?"bg-red-100":"bg-amber-100"}`}><FileText className={`w-4 h-4 ${dias<0?"text-red-600":"text-amber-600"}`}/></div>
              <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-slate-900 truncate">{doc.titulo}</p><p className="text-xs text-slate-500 truncate">{doc.unidade} › {doc.setor} › {doc.area}</p></div>
              <div className="text-right flex-shrink-0"><StatusBadge status={doc.status}/><p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-end"><Calendar className="w-3 h-3"/>{formatDate(doc.dataRevisao)}</p></div>
            </Link>); })}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4 text-sm">Por categoria</h2>
            {d.porCategoria.map((cat: any) => { const pct = d.total>0?Math.round((cat.total/d.total)*100):0; return (
              <div key={cat.id} className="mb-3">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{background:cat.cor}}/>{cat.sigla}</span><span className="text-xs font-semibold text-slate-900">{cat.total}</span></div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:cat.cor}}/></div>
              </div>); })}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-3 text-sm">Recém adicionados</h2>
            {d.ultimosAdicionados.map((doc: any) => (
              <Link key={doc.id} href={`/documentos/${doc.id}`} className="block hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors mb-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{doc.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:doc.cor}}/>{doc.sigla} · {doc.unidade}</p>
              </Link>))}
          </div>
        </div>
      </div>
    </div>
  );
}
