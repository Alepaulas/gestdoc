import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { buscarUsuarioPorEmail } from "@/lib/sheets";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid", "email", "profile",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return "/login?error=NoEmail";

      const accessToken  = account?.access_token;
      const refreshToken = account?.refresh_token;
      if (!accessToken) return "/login?error=NoToken";

      let usuario = null;
      try {
        usuario = await buscarUsuarioPorEmail(accessToken, refreshToken, user.email);
      } catch {}

      // Verifica acesso — admin hardcoded sempre passa
      const adminEmail = process.env.ADMIN_EMAIL ?? "";
      const isAdmin = user.email === adminEmail;
      if (!usuario && !isAdmin) return "/login?error=AccessDenied";

      // Cria ou atualiza usuário no banco (necessário para FK em Solicitacao)
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name:       user.name  ?? usuario?.nome ?? "",
            image:      user.image ?? "",
            papelFluxo: usuario?.papel    ?? (isAdmin ? "ADMIN" : null),
            role:       isAdmin ? "ADMIN" : (usuario?.papel === "ADMIN" ? "ADMIN" : "EDITOR"),
          },
          create: {
            email:      user.email,
            name:       user.name  ?? usuario?.nome ?? "",
            image:      user.image ?? "",
            papelFluxo: usuario?.papel    ?? (isAdmin ? "ADMIN" : null),
            role:       isAdmin ? "ADMIN" : (usuario?.papel === "ADMIN" ? "ADMIN" : "EDITOR"),
          },
        });
      } catch (e) {
        console.error("Erro ao criar usuário no banco:", e);
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id      = user.id;
        token.email   = user.email;
        token.name    = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      // Busca papel e unidade da planilha
      if (token.email && token.accessToken && !token.papelFluxo) {
        try {
          const usuario = await buscarUsuarioPorEmail(
            token.accessToken as string,
            token.refreshToken as string | undefined,
            token.email as string
          );
          if (usuario) {
            token.papelFluxo  = usuario.papel;
            token.unidade     = usuario.unidade;
            token.role        = usuario.papel === "ADMIN" ? "ADMIN" : "EDITOR";
            token.nomeUsuario = usuario.nome || token.name;
          }
        } catch {}
      }

      // Fallback admin
      if (!token.role) {
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        token.role = token.email === adminEmail ? "ADMIN" : "EDITOR";
      }
      if (!token.papelFluxo) {
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        if (token.email === adminEmail) token.papelFluxo = "ADMIN";
      }

      // Sincroniza ID do banco
      if (token.email && !token.dbId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true },
          });
          if (dbUser) token.dbId = dbUser.id;
        } catch {}
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id         = token.dbId ?? token.sub ?? token.id;
        (session.user as any).role       = token.role ?? "EDITOR";
        (session.user as any).papelFluxo = token.papelFluxo ?? null;
        (session.user as any).unidade    = token.unidade ?? null;
        session.user.email = token.email as string;
        session.user.name  = (token.nomeUsuario as string) || (token.name as string);
        session.user.image = token.picture as string;
      }
      (session as any).accessToken  = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
};
