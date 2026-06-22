import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/db";
import { temAcesso, NAV_ITEMS, type Modulo } from "@/lib/modulos";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params?: any }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Busca papel atualizado do banco (fonte da verdade)
  const userId = (session.user as any).id as string;
  let papelFluxo: string | null = (session.user as any).papelFluxo ?? null;
  let role: string = (session.user as any).role ?? "EDITOR";

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { papelFluxo: true, role: true },
    });
    if (dbUser) {
      papelFluxo = dbUser.papelFluxo;
      if (dbUser.role) role = dbUser.role;
    }
  } catch {}

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar/>
      <main className="flex-1 ml-60 p-8 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
