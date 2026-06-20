"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Home, FileText, Map, ClipboardList, Settings, LogOut, ChevronRight, WandSparkles, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href:"/dashboard", label:"Home",          icon:Home },
  { href:"/documentos", label:"Documentos",   icon:FileText },
  { href:"/ona",        label:"Mapa ONA",     icon:Map },
  { href:"/auditoria",   label:"Auditoria",     icon:ClipboardList },
  { href:"/formatador", label:"Formatador",   icon:WandSparkles },
  { href:"/comparador", label:"Comparador",   icon:GitCompare },
  { href:"/configuracoes", label:"Configurações", icon:Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-50 shadow-xl">
      <div className="h-14 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-white"/>
        </div>
        <div className="leading-none">
          <p className="text-white font-bold text-sm">GestDoc</p>
          <p className="text-slate-500 text-[10px] mt-0.5">ISGH · Gestão Documental</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => {
          const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}>
              <item.icon className="w-4 h-4 flex-shrink-0"/>
              <span className="flex-1 font-medium">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60"/>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
          {session?.user?.image
            ? <img src={session.user.image} className="w-7 h-7 rounded-full" alt=""/>
            : <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{session?.user?.name?.[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{session?.user?.name}</p>
            <p className="text-slate-500 text-[10px] truncate">{session?.user?.email}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl:"/login" })} className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </aside>
  );
}
