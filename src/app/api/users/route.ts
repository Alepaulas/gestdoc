import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await query<any>("SELECT id,name,email,image,role,createdAt FROM User ORDER BY name");
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, role } = await req.json();
  await execute("UPDATE User SET role=?,updatedAt=datetime('now') WHERE id=?", [role, userId]);
  return NextResponse.json({ success: true });
}
