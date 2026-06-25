import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { temAcesso, NAV_ITEMS, type Modulo } from "@/lib/modulos";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;

    const papelFluxo = token?.papelFluxo ?? null;
    const role       = token?.role ?? "EDITOR";

    // Encontra o módulo correspondente à rota atual
    const navItem = NAV_ITEMS.find(
      (item) => item.href !== "/dashboard" && pathname.startsWith(item.href)
    );

    if (navItem && !temAcesso(navItem.modulo as Modulo, papelFluxo, role)) {
      // Redireciona para o dashboard com mensagem de acesso negado
      return NextResponse.redirect(new URL("/dashboard?acesso=negado", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*", "/documentos/:path*", "/solicitacoes/:path*",
    "/inventario/:path*", "/ona/:path*", "/auditoria/:path*",
    "/formatador/:path*", "/revisor/:path*", "/configuracoes/:path*",
  ],
};
