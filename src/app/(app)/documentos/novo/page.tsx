"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Loader2, Hash } from "lucide-react";
import Link from "next/link";
import { TIPOS_ORDENADOS } from "@/lib/normaZero";

const AREAS = [
  {sigla:"AGT",nome:"Agência Transfusional"},{sigla:"ALM",nome:"Almoxarifado"},
  {sigla:"AMB",nome:"Ambulatório Geral"},{sigla:"CCG",nome:"Centro Cirúrgico"},
  {sigla:"CME",nome:"CME"},{sigla:"CLM",nome:"Clínica Médica"},
  {sigla:"CLC",nome:"Clínica Cirúrgica"},{sigla:"CLP",nome:"Clínica Pediátrica"},
  {sigla:"CLO",nome:"Clínica Obstétrica"},{sigla:"DIR",nome:"Direção"},
  {sigla:"EMG",nome:"Emergência"},{sigla:"ENF",nome:"Enfermagem"},
  {sigla:"FAR",nome:"Farmácia"},{sigla:"FIS",nome:"Fisioterapia"},
  {sigla:"GER",nome:"Geral"},{sigla:"HIG",nome:"Higienização"},
  {sigla:"LAB",nome:"Laboratório"},{sigla:"MED",nome:"Medicina"},
  {sigla:"NAC",nome:"Núcleo Atendimento ao Cliente"},{sigla:"NAF",nome:"Núcleo Adm. Financeiro"},
  {sigla:"NGP",nome:"Núcleo Gestão de Pessoas"},{sigla:"NGS",nome:"NUGESP"},
  {sigla:"NUT",nome:"Nutrição"},{sigla:"PSI",nome:"Psicologia"},
  {sigla:"UTI",nome:"UTI Adulto"},{sigla:"NEO",nome:"UTI Neonatal"},
  {sigla:"UTP",nome:"UTI Pediátrica"},{sigla:"SGQ",nome:"Sistema de Qualidade"},
];

function Input({ label, value, onChange, placeholder, type="text", required=false }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"/>
    </div>
  );
}

function Select({ label, value, onChange, options, required=false }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
        <option value="">Selecione...</option>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function NovoDocumentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [codigoPreview, setCodigoPreview] = useState("");
  const [codigoLoading, setCodigoLoading] = useState(false);

  const [form, setForm] = useState({
    // Identificação
    tipoDocumento: "", areaSigla: "",
    titulo: "", unidade: "", setor: "",
    // Demanda
    statusDemanda: "Em andamento",
    statusDocumento: "",
    vigencia: "",
    dataSolicitacao: new Date().toLocaleDateString("pt-BR"),
    linkEmail: "",
    // Validação
    encaminhadoValidacao: "",
    dataValidacao: "",
    prazoMaxPadronizacao: "",
    // Padronização
    dataPadronizacao: new Date().toLocaleDateString("pt-BR"),
    dataPublicacao: new Date().toLocaleDateString("pt-BR"),
    versao: "00",
    revisao: "00",
    // Autoria
    elaborador: "",
    aprovador: "",
    concluidaPor: "",
    criticidade: "",
  });

  const set = (key: string) => (val: string) => setForm(f => ({...f, [key]: val}));

  async function buscarCodigo(tipo: string, area: string) {
    if (!tipo || !area) { setCodigoPreview(""); return; }
    setCodigoLoading(true);
    try {
      const res = await fetch(`/api/codigo-documento?tipo=${tipo}&area=${area}`);
      const j = await res.json();
      setCodigoPreview(j.codigo ?? `${tipo}.${area}.001`);
    } catch { setCodigoPreview(`${tipo}.${area}.001`); }
    finally { setCodigoLoading(false); }
  }

  async function submit(e: any) {
    e.preventDefault();
    if (!form.tipoDocumento || !form.areaSigla || !form.titulo) {
      alert("Preencha Tipo, Área e Título."); return;
    }
    setLoading(true);
    try {
      const tipoNome = TIPOS_ORDENADOS.find(t => t.codigo === form.tipoDocumento)?.nome ?? form.tipoDocumento;
      const setorNome = AREAS.find(a => a.sigla === form.areaSigla)?.nome ?? form.areaSigla;

      const payload = {
        // Identificação
        tipoDocumento:        `${form.tipoDocumento} — ${tipoNome}`,
        codigo:               codigoPreview,
        titulo:               form.titulo,
        unidade:              form.unidade,
        setor:                setorNome,
        // Demanda
        statusDemanda:        form.statusDemanda,
        statusDocumento:      form.statusDocumento,
        vigencia:             form.vigencia,
        dataSolicitacao:      form.dataSolicitacao,
        linkEmail:            form.linkEmail,
        // Validação
        encaminhadoValidacao: form.encaminhadoValidacao,
        dataValidacao:        form.dataValidacao,
        prazoMaxPadronizacao: form.prazoMaxPadronizacao,
        // Padronização
        dataPadronizacao:     form.dataPadronizacao,
        dataPublicacao:       form.dataPublicacao,
        versao:               form.versao,
        revisao:              form.revisao,
        // Autoria
        concluidaPor:         form.concluidaPor,
      };

      const res = await fetch("/api/lista-mestra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) router.push("/documentos/lista-mestra");
      else { alert(data.error || "Erro ao cadastrar"); setLoading(false); }
    } catch { alert("Erro ao salvar"); setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/documentos/lista-mestra" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar para Lista Mestra
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Novo Documento</h1>
      </div>

      <form onSubmit={submit} className="space-y-5">

        {/* Identificação */}
        <Section title="Identificação">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de Documento" required value={form.tipoDocumento}
              onChange={(v: string) => { set("tipoDocumento")(v); buscarCodigo(v, form.areaSigla); }}
              options={TIPOS_ORDENADOS.map(t => ({ value: t.codigo, label: `${t.codigo} — ${t.nome}` }))}/>
            <Select label="Setor (Área)" required value={form.areaSigla}
              onChange={(v: string) => { set("areaSigla")(v); buscarCodigo(form.tipoDocumento, v); }}
              options={AREAS.map(a => ({ value: a.sigla, label: `${a.sigla} — ${a.nome}` }))}/>
          </div>

          {codigoPreview && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <Hash className="w-4 h-4 text-indigo-600 flex-shrink-0"/>
              <span className="text-xs text-indigo-600 font-medium">Código gerado:</span>
              {codigoLoading
                ? <span className="text-xs text-indigo-400 animate-pulse">Consultando Lista Mestra...</span>
                : <span className="font-mono font-bold text-indigo-800">{codigoPreview}</span>
              }
            </div>
          )}

          <Input label="Título do Documento" required value={form.titulo} onChange={set("titulo")} placeholder="Ex: POP de Higienização de Mãos"/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unidade" value={form.unidade} onChange={set("unidade")} placeholder="Ex: HGWA"/>
            <Input label="Vigência" value={form.vigencia} onChange={set("vigencia")} placeholder="Ex: 2 anos"/>
          </div>
        </Section>

        {/* Demanda */}
        <Section title="Dados da Demanda">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status da Demanda" value={form.statusDemanda} onChange={set("statusDemanda")}
              options={["Em andamento","Concluída","Cancelada","Pendente"].map(s=>({value:s,label:s}))}/>
            <Select label="Status do Documento" value={form.statusDocumento} onChange={set("statusDocumento")}
              options={["VIGENTE","VENCENDO","VENCIDO","OBSOLETO","EM ELABORAÇÃO"].map(s=>({value:s,label:s}))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data da Solicitação (E-mail/FLUIG)" value={form.dataSolicitacao} onChange={set("dataSolicitacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Link E-mail / FLUIG" value={form.linkEmail} onChange={set("linkEmail")} placeholder="https://..."/>
          </div>
        </Section>

        {/* Validação */}
        <Section title="Validação">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Encaminhado para Validação" value={form.encaminhadoValidacao} onChange={set("encaminhadoValidacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Data da Validação" value={form.dataValidacao} onChange={set("dataValidacao")} placeholder="DD/MM/AAAA"/>
          </div>
          <Input label="Prazo Máximo para Padronização" value={form.prazoMaxPadronizacao} onChange={set("prazoMaxPadronizacao")} placeholder="DD/MM/AAAA"/>
        </Section>

        {/* Padronização */}
        <Section title="Padronização e Publicação">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data da Padronização/Revisão" value={form.dataPadronizacao} onChange={set("dataPadronizacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Data da Publicação" value={form.dataPublicacao} onChange={set("dataPublicacao")} placeholder="DD/MM/AAAA"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Versão" value={form.versao} onChange={set("versao")} placeholder="00"/>
            <Input label="Revisão" value={form.revisao} onChange={set("revisao")} placeholder="00"/>
          </div>
        </Section>

        {/* Autoria */}
        <Section title="Autoria">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Elaborador" value={form.elaborador} onChange={set("elaborador")} placeholder="Nome e cargo"/>
            <Input label="Aprovador" value={form.aprovador} onChange={set("aprovador")} placeholder="Nome e cargo"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Concluída por" value={form.concluidaPor} onChange={set("concluidaPor")} placeholder="Nome"/>
            <Select label="Criticidade" value={form.criticidade} onChange={set("criticidade")}
              options={["ALTA","MÉDIA","BAIXA"].map(s=>({value:s,label:s}))}/>
          </div>
        </Section>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Salvando...</> : "Salvar na Lista Mestra"}
        </button>
      </form>
    </div>
  );
}
