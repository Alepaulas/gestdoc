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

export async function listDriveFiles(userId: string, q?: string) {
  try {
    const drive = await getDriveClient(userId);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const parts = ["trashed=false", folderId ? `'${folderId}' in parents` : null, q ? `name contains '${q}'` : null];
    const res = await drive.files.list({ q: parts.filter(Boolean).join(" and "), fields: "files(id,name,webViewLink,mimeType,modifiedTime,size)", orderBy: "modifiedTime desc", pageSize: 50 });
    return res.data.files ?? [];
  } catch { return []; }
}
