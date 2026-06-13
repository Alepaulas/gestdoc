"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, FileText, Map, CheckSquare, Building2, Settings, LogOut, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href:"/dashboard", label:"Dashboard", icon:LayoutDashboard },
  { href:"/documentos", label:"Documentos", icon:FileText },
  { href:"/ona", label:"Mapa ONA", icon:Map },
  { href:"/aprovacao", label:"Aprovações", icon:CheckSquare },
  { href:"/configuracoes", label:"Configurações", icon:Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-50">
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div><p className="text-white font-semibold text-sm leading-none">GestDoc</p><p className="text-slate-500 text-xs mt-0.5">Gestão Documental</p></div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => {
          const active = path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",active?"bg-blue-600 text-white":"text-slate-400 hover:bg-slate-800 hover:text-white")}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 font-medium">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
          {session?.user?.image
            ? <img src={session.user.image} className="w-7 h-7 rounded-full" alt="" />
            : <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{session?.user?.name?.[0]}</div>
          }
          <div className="flex-1 min-w-0"><p className="text-white text-xs font-medium truncate">{session?.user?.name}</p><p className="text-slate-500 text-xs truncate">{(session?.user as any)?.role}</p></div>
          <button onClick={() => signOut({ callbackUrl:"/login" })} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
  );
}
