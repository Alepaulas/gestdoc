import { google } from "googleapis";
import { queryOne } from "./db";

async function getDriveClient(userId: string) {
  const account = await queryOne<any>("SELECT * FROM Account WHERE userId=? AND provider='google'", [userId]);
  if (!account?.access_token) throw new Error("Conta Google não vinculada");
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ access_token: account.access_token, refresh_token: account.refresh_token });
  return google.drive({ version: "v3", auth: oauth2 });
}

export async function uploadToDrive(userId: string, fileName: string, mimeType: string, buffer: Buffer) {
  const drive = await getDriveClient(userId);
  const { Readable } = await import("stream");
  const meta: any = { name: fileName };
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) meta.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  const res = await drive.files.create({
    requestBody: meta,
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id,webViewLink,name",
  });
  return { fileId: res.data.id!, fileUrl: res.data.webViewLink!, fileName: res.data.name! };
}

/**
 * Converte um .docx em .pdf usando o próprio Google Drive:
 * 1) sobe o buffer convertendo para Google Docs (mantém a formatação fielmente)
 * 2) exporta esse Google Doc como PDF
 * 3) apaga o Google Doc temporário
 * Não usa a tabela Account/db — recebe os tokens direto da sessão,
 * no mesmo padrão usado em src/lib/sheets.ts.
 */
export async function converterDocxParaPdf(
  accessToken: string,
  refreshToken: string | undefined,
  buffer: Buffer,
  nomeTemporario: string
): Promise<Buffer> {
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });
  const { Readable } = await import("stream");

  const upload = await drive.files.create({
    requestBody: {
      name: nomeTemporario,
      mimeType: "application/vnd.google-apps.document",
    },
    media: {
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const fileId = upload.data.id;
  if (!fileId) throw new Error("Falha ao criar Google Doc temporário para conversão.");

  try {
    const pdfRes = await drive.files.export(
      { fileId, mimeType: "application/pdf" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(pdfRes.data as ArrayBuffer);
  } finally {
    // Best-effort: nunca deixa o temporário acumular na conta do usuário
    await drive.files.delete({ fileId }).catch(() => {});
  }
}

export async function listDriveFiles(userId: string, q?: string) {
  try {
    const drive = await getDriveClient(userId);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const parts = ["trashed=false", folderId ? `'${folderId}' in parents` : null, q ? `name contains '${q}'` : null];
    const res = await drive.files.list({ q: parts.filter(Boolean).join(" and "), fields: "files(id,name,webViewLink,mimeType,modifiedTime,size)", orderBy: "modifiedTime desc", pageSize: 50 });
    return res.data.files ?? [];
  } catch { return []; }
}
