import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
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
      return dominios.some(d => user.email?.endsWith(d));
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      // role padrão — admin para primeiro usuário
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
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
};
