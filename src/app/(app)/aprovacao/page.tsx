"use client";
import { useEffect, useState } from "react";
import { CheckSquare, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function Aprovacoes() {
  const [etapas, setEtapas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFluxo, setModalFluxo] = useState(false);
  const [form, setForm] = useState({ documentoId:"", revisorId:"", aprovadorId:"" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [us, ds] = await Promise.all([fetch("/api/users").then(r=>r.json()), fetch("/api/documentos").then(r=>r.json())]);
    setUsers(us); setDocs(ds.documentos||[]); setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  async function iniciarFluxo(e: any) {
    e.preventDefault(); setSubmitting(true);
    await fetch("/api/aprovacao",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    setSubmitting(false); setModalFluxo(false); load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CheckSquare className="w-6 h-6 text-purple-600"/>Fluxo de Aprovação</h1><p className="text-slate-500 text-sm mt-0.5">Elaboração → Revisão → Aprovação com evidência para ONA</p></div>
        <button onClick={()=>setModalFluxo(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">+ Iniciar fluxo</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <h2 className="font-bold text-slate-900 mb-4 text-sm">Como funciona</h2>
        <div className="flex items-center gap-3">
          {[{label:"Elaboração",desc:"Responsável cria/edita",color:"bg-slate-100 text-slate-700"},{label:"→",desc:"",color:""},{label:"Revisão",desc:"Técnico valida",color:"bg-purple-100 text-purple-700"},{label:"→",desc:"",color:""},{label:"Aprovação",desc:"Coordenação aprova",color:"bg-blue-100 text-blue-700"},{label:"→",desc:"",color:""},{label:"Publicação",desc:"Status → Vigente + leitura obrigatória",color:"bg-emerald-100 text-emerald-700"}].map((s,i)=>
            s.label==="→"?<div key={i} className="text-slate-400 text-lg">→</div>
            :<div key={i} className="flex-1 text-center"><span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${s.color}`}>{s.label}</span><p className="text-xs text-slate-500 mt-1">{s.desc}</p></div>
          )}
        </div>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"/></div>
      :<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos disponíveis para fluxo de aprovação</p></div>
        {docs.filter(d=>["RASCUNHO","EM_REVISAO"].includes(d.status)).map((doc:any)=>(
          <div key={doc.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:doc.cor+"20"}}><span className="text-xs font-bold" style={{color:doc.cor}}>{doc.sigla}</span></div>
            <div className="flex-1"><p className="font-semibold text-sm text-slate-900">{doc.titulo}</p><p className="text-xs text-slate-500">{doc.codigo} · v{doc.versao} · {doc.responsavelNome}</p></div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${doc.status==="EM_REVISAO"?"bg-blue-100 text-blue-700":"bg-slate-100 text-slate-600"}`}>{doc.status}</span>
            {doc.status==="RASCUNHO"&&<button onClick={()=>{setForm(f=>({...f,documentoId:doc.id}));setModalFluxo(true);}} className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors">Iniciar revisão</button>}
          </div>
        ))}
        {docs.filter(d=>["RASCUNHO","EM_REVISAO"].includes(d.status)).length===0&&
          <div className="flex flex-col items-center py-10 text-slate-400"><CheckCircle className="w-10 h-10 mb-2 text-emerald-300"/><p className="text-sm">Nenhum documento aguardando aprovação</p></div>}
      </div>}
      {modalFluxo&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setModalFluxo(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Iniciar fluxo de aprovação</h2>
            <form onSubmit={iniciarFluxo} className="space-y-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Documento *</label><select required value={form.documentoId} onChange={e=>setForm(f=>({...f,documentoId:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">Selecione...</option>{docs.filter(d=>d.status==="RASCUNHO").map((d:any)=><option key={d.id} value={d.id}>{d.codigo} — {d.titulo}</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Revisor *</label><select required value={form.revisorId} onChange={e=>setForm(f=>({...f,revisorId:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">Selecione...</option>{users.map((u:any)=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Aprovador *</label><select required value={form.aprovadorId} onChange={e=>setForm(f=>({...f,aprovadorId:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"><option value="">Selecione...</option>{users.map((u:any)=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select></div>
              <p className="text-xs text-slate-500 bg-purple-50 p-3 rounded-lg">Ao iniciar, o revisor receberá um e-mail com link de aprovação. Após revisão, o aprovador será notificado. A publicação gera leitura obrigatória automática para a equipe.</p>
              <div className="flex gap-3"><button type="button" onClick={()=>setModalFluxo(false)} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button><button type="submit" disabled={submitting} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">{submitting?"Iniciando...":"Iniciar"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
