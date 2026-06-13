"use client";
import { useEffect, useState } from "react";
import { ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle, Map } from "lucide-react";

export default function ONAPage() {
  const [data, setData] = useState<any>(null);
  const [nivel, setNivel] = useState(1);
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    setData(null);
    fetch(`/api/ona?nivel=${nivel}`).then(r=>r.json()).then(setData);
  }, [nivel]);

  const statusIcon = (s: string) => {
    if (s==="ok") return <CheckCircle className="w-4 h-4 text-emerald-600"/>;
    if (s==="warn") return <AlertTriangle className="w-4 h-4 text-amber-500"/>;
    return <XCircle className="w-4 h-4 text-red-500"/>;
  };
  const statusColor = (s: string) => s==="ok"?"#639922":s==="warn"?"#BA7517":"#E24B4A";

  const toggle = (k: string) => setOpen(o => o.includes(k)?o.filter(x=>x!==k):[...o,k]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Map className="w-6 h-6 text-blue-600"/>Mapa de Conformidade ONA</h1><p className="text-slate-500 text-sm mt-0.5">Cruzamento automático entre documentos vigentes e itens da norma</p></div>
        <div className="flex gap-2">
          {[1,2,3].map(n=><button key={n} onClick={()=>setNivel(n)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${nivel===n?"bg-blue-600 text-white":"border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>ONA {n}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><p className="text-3xl font-bold text-blue-600">{data.conformidade}%</p><p className="text-sm text-slate-500 mt-0.5">Conformidade geral</p></div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><p className="text-3xl font-bold text-emerald-600">{data.totalOk}</p><p className="text-sm text-slate-500 mt-0.5">Itens atendidos</p></div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><p className="text-3xl font-bold text-amber-600">{data.totalWarn}</p><p className="text-sm text-slate-500 mt-0.5">Atendimento parcial</p></div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><p className="text-3xl font-bold text-red-600">{data.totalGap}</p><p className="text-sm text-slate-500 mt-0.5">Lacunas documentais</p></div>
      </div>
      <div className="space-y-3">
        {data.secoes.map((secao: any) => (
          <div key={secao.secao} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={()=>toggle(secao.secao)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-900">{secao.secao}</p>
                <p className="text-xs text-slate-500 mt-0.5">{secao.itens.length} itens · {secao.ok} atendidos · {secao.warn} parciais · {secao.gap} lacunas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${secao.pct}%`,background:secao.pct>=80?"#639922":secao.pct>=50?"#BA7517":"#E24B4A"}}/>
                </div>
                <span className="text-sm font-bold min-w-[36px] text-right" style={{color:secao.pct>=80?"#639922":secao.pct>=50?"#BA7517":"#E24B4A"}}>{secao.pct}%</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open.includes(secao.secao)?"rotate-90":""}`}/>
              </div>
            </button>
            {open.includes(secao.secao) && (
              <div className="border-t border-slate-100">
                {secao.itens.map((item: any) => (
                  <div key={item.id} className="px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">{item.codigo}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{item.titulo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.descricao}</p>
                        {item.docs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.docs.map((d: any) => (
                              <span key={d.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg" style={{background:d.status==="VIGENTE"?"#eaf3de":d.status==="VENCENDO"?"#faeeda":"#fcebeb",color:statusColor(item.status)}}>
                                <FileText className="w-3 h-3"/>{d.codigo}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.docs.length === 0 && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3"/>Nenhum documento vigente vinculado a este item</p>}
                      </div>
                      <div className="flex-shrink-0">{statusIcon(item.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
