import { google } from "googleapis";
import { query, queryOne } from "./db";

async function getGmailClient(userId: string) {
  const account = await queryOne<any>(
    "SELECT * FROM Account WHERE userId=? AND provider='google'", [userId]
  );
  if (!account?.access_token) throw new Error("Conta Google não encontrada");
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ access_token: account.access_token, refresh_token: account.refresh_token });
  return google.gmail({ version: "v1", auth: oauth2 });
}

function makeRaw(to: string, subject: string, html: string, from: string) {
  const msg = [`From: GestDoc <${from}>`,`To: ${to}`,`Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0","Content-Type: text/html; charset=UTF-8","",html].join("\n");
  return Buffer.from(msg).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

export async function sendEmail(adminUserId: string, to: string, subject: string, html: string) {
  try {
    const gmail = await getGmailClient(adminUserId);
    const from = process.env.GMAIL_FROM ?? "gestdoc@hospital.com.br";
    await gmail.users.messages.send({ userId:"me", requestBody:{ raw: makeRaw(to, subject, html, from) } });
    return true;
  } catch(e) {
    console.error("Gmail error:", e);
    return false;
  }
}

const appUrl = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export function htmlAlerta(titulo: string, codigo: string, status: string, dataRevisao: string, docId: string) {
  const cor = status==="VENCIDO"?"#E24B4A":status==="VENCENDO"?"#BA7517":"#1D4ED8";
  const label = status==="VENCIDO"?"🚨 Documento Vencido":"⚠️ Documento Vencendo";
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#1D4ED8;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">${label}</h1>
  </div>
  <div style="padding:28px">
    <div style="background:#f8fafc;border-left:4px solid ${cor};padding:14px;border-radius:6px;margin-bottom:20px">
      <p style="margin:0;font-size:12px;color:#64748b">Status</p>
      <p style="margin:4px 0 0;font-weight:700;color:${cor}">${status}</p>
    </div>
    <p><strong>Documento:</strong> ${titulo}</p>
    <p><strong>Código:</strong> <code>${codigo}</code></p>
    <p><strong>Data de Revisão:</strong> ${dataRevisao}</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${appUrl()}/documentos/${docId}" style="background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver Documento</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8">GestDoc — Sistema de Gestão Documental</div>
</div></body></html>`;
}

export function htmlLeitura(titulo: string, codigo: string, versao: string, token: string) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#059669;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">📋 Leitura Obrigatória</h1>
  </div>
  <div style="padding:28px">
    <p>Um documento do qual você é responsável foi atualizado e requer sua confirmação de leitura.</p>
    <div style="background:#f0fdf4;border-left:4px solid #059669;padding:14px;border-radius:6px;margin:20px 0">
      <p style="margin:0"><strong>${titulo}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b">${codigo} — Versão ${versao}</p>
    </div>
    <p style="font-size:13px;color:#64748b">Após ler o documento, clique no botão abaixo para registrar sua confirmação. Este registro é exigido para conformidade ONA.</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${appUrl()}/leitura/confirmar?token=${token}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">✅ Confirmar Leitura</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;font-size:12px;color:#94a3b8">GestDoc — Evidência registrada no audit log para fins de acreditação ONA</div>
</div></body></html>`;
}

export function htmlAprovacao(titulo: string, codigo: string, tipo: string, etapaId: string) {
  const label = tipo==="REVISOR"?"Revisão":"Aprovação";
  const cor = tipo==="REVISOR"?"#7C3AED":"#1D4ED8";
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:${cor};padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">📝 Pendência de ${label}</h1>
  </div>
  <div style="padding:28px">
    <p>Você tem uma pendência de <strong>${label.toLowerCase()}</strong> no sistema GestDoc.</p>
    <div style="background:#f8fafc;border-left:4px solid ${cor};padding:14px;border-radius:6px;margin:20px 0">
      <p style="margin:0"><strong>${titulo}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b">Código: ${codigo}</p>
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;gap:12px;justify-content:center">
      <a href="${appUrl()}/aprovacao/${etapaId}?acao=aprovar" style="background:${cor};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">✅ Aprovar</a>
      <a href="${appUrl()}/aprovacao/${etapaId}?acao=devolver" style="background:#f1f5f9;color:#475569;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;border:1px solid #e2e8f0">↩ Devolver</a>
    </div>
  </div>
</div></body></html>`;
}
