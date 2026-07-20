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

      let papel = "EDITOR";
      let nome  = user.name || "";

      try {
        const usuario = await buscarUsuarioPorEmail(accessToken, refreshToken, user.email);
        if (!usuario) {
          const adminEmail = process.env.ADMIN_EMAIL ?? "";
          if (user.email !== adminEmail) return "/login?error=AccessDenied";
        } else {
          papel = usuario.papel;
          nome  = usuario.nome || user.name || "";
        }
      } catch {
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        if (user.email !== adminEmail) return "/login?error=AccessDenied";
      }

      // Garante usuário no banco para FKs do Prisma funcionarem
      try {
        await prisma.user.upsert({
          where:  { email: user.email },
          update: { name: nome, image: user.image || null, papelFluxo: papel, role: papel === "ADMIN" ? "ADMIN" : "EDITOR" },
          create: {
            id:         user.id || user.email,
            email:      user.email,
            name:       nome,
            image:      user.image || null,
            role:       papel === "ADMIN" ? "ADMIN" : "EDITOR",
            papelFluxo: papel,
          },
        });
      } catch (e) {
        console.error("Erro ao criar usuário no banco:", e);
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user)    { token.id = user.id; token.email = user.email; token.name = user.name; token.picture = user.image; }
      if (account) { token.accessToken = account.access_token; token.refreshToken = account.refresh_token; }

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

      if (!token.role) {
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        token.role = token.email === adminEmail ? "ADMIN" : "EDITOR";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id         = token.sub ?? token.id;
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
