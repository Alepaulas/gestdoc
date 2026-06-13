"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FileText, LayoutDashboard, Map, Settings, List, ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

const nav = [
  { href:"/dashboard",    label:"Dashboard",    icon:LayoutDashboard },
  { href:"/documentos",   label:"Documentos",   icon:FileText,
    sub:[
      { href:"/documentos",         label:"Todos os documentos" },
      { href:"/documentos/lista-mestra", label:"Lista Mestra" },
    ]
  },
  { href:"/ona",          label:"Mapa ONA",     icon:Map },
  { href:"/configuracoes",label:"Configurações", icon:Settings },
];

export function Topbar() {
  const path = usePathname();
  const { data: session } = useSession();
  const [userOpen, setUserOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<string|null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setUserOpen(false); setSubOpen(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-50 flex items-center px-6 gap-6 shadow-sm">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 mr-4">
        <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="leading-none">
          <p className="font-bold text-slate-900 text-sm">GestDoc</p>
          <p className="text-slate-400 text-[10px]">ISGH · Governança Documental</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-1 flex-1" ref={ref}>
        {nav.map(item => {
          const active = path.startsWith(item.href) && (item.href !== "/dashboard" || path === "/dashboard");
          const hasSubOpen = subOpen === item.href;
          return (
            <div key={item.href} className="relative">
              {item.sub ? (
                <button
                  onClick={() => setSubOpen(hasSubOpen ? null : item.href)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                  <ChevronDown className={cn("w-3 h-3 transition-transform", hasSubOpen && "rotate-180")} />
                </button>
              ) : (
                <Link href={item.href} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )}
              {item.sub && hasSubOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  {item.sub.map(s => (
                    <Link key={s.href} href={s.href}
                      onClick={() => setSubOpen(null)}
                      className={cn("flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                        path === s.href ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
                      )}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setUserOpen(o => !o)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          {session?.user?.image
            ? <img src={session.user.image} className="w-7 h-7 rounded-full" alt="" />
            : <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {session?.user?.name?.[0]}
              </div>
          }
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-none">{session?.user?.name?.split(" ")[0]}</p>
            <p className="text-xs text-slate-400 mt-0.5">{(session?.user as any)?.role}</p>
          </div>
          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", userOpen && "rotate-180")} />
        </button>
        {userOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl:"/login" })}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
