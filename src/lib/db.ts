import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

let _db: any = null;

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  _db = new SQL.Database(fileBuffer);
  return _db;
}

function save(db: any) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    const obj: any = {};
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    cols.forEach((c: string, i: number) => { obj[c] = vals[i]; });
    rows.push(obj as T);
  }
  stmt.free();
  return rows;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
  save(db);
}

export async function executeMulti(sql: string): Promise<void> {
  const db = await getDb();
  db.run(sql);
  save(db);
}
