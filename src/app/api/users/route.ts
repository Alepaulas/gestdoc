import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerUsuarios, getSheetsClientPublic } from "@/lib/sheets";
import { google } from "googleapis";

// GET — lista usuários da aba USUARIOS da planilha
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token não encontrado" }, { status: 401 });

  try {
    const usuarios = await lerUsuarios(accessToken, refreshToken);
    return NextResponse.json(usuarios);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — adiciona ou atualiza usuário na aba USUARIOS
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  const { email, nome, papel, unidade } = await req.json();

  if (!email || !papel) return NextResponse.json({ error: "Email e papel são obrigatórios." }, { status: 400 });

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const sheets = google.sheets({ version: "v4", auth: oauth2 });
  const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
  const SHEET = "USUARIOS";

  // Verifica se já existe
  const existing = await lerUsuarios(accessToken, refreshToken);
  const idx = existing.findIndex(u => u.email === email.toLowerCase());

  if (idx >= 0) {
    // Atualiza linha existente (linha = idx + 2, pois linha 1 é cabeçalho)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET}!A${idx + 2}:D${idx + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [[email.toLowerCase(), nome, papel.toUpperCase(), unidade.toUpperCase()]] },
    });
  } else {
    // Adiciona novo
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET}!A:D`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[email.toLowerCase(), nome, papel.toUpperCase(), unidade.toUpperCase()]] },
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove usuário da aba USUARIOS
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  const { email } = await req.json();

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  const sheets = google.sheets({ version: "v4", auth: oauth2 });
  const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
  const SHEET = "USUARIOS";

  const existing = await lerUsuarios(accessToken, refreshToken);
  const idx = existing.findIndex(u => u.email === email.toLowerCase());
  if (idx < 0) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  // Limpa a linha (não deleta, para manter índices)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET}!A${idx + 2}:D${idx + 2}`,
  });

  return NextResponse.json({ success: true });
}
