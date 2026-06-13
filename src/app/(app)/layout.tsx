import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="pt-14 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
