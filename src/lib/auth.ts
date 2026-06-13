import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
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
    async signIn({ user }) {
      const dominios = (process.env.ALLOWED_DOMAINS ?? "")
        .split(",").map(d => d.trim()).filter(Boolean);
      if (dominios.length === 0) return true;
      const permitido = dominios.some(d => user.email?.endsWith(d));
      if (!permitido) return "/login?error=DomainNotAllowed";
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        // Guarda tokens Google na sessão JWT
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      if (!token.role) {
        const adminEmail = process.env.ADMIN_EMAIL ?? "";
        token.role = token.email === adminEmail ? "ADMIN" : "EDITOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub ?? token.id;
        (session.user as any).role = token.role ?? "EDITOR";
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      // Expõe tokens Google na sessão (necessário para Sheets/Drive/Gmail)
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
};
