import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query, queryOne, execute } from "./db";

// Minimal custom adapter for sql.js (no Prisma CLI needed)
const SqlAdapter = {
  async createUser(user: any) {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await execute(
      "INSERT OR IGNORE INTO User(id,name,email,emailVerified,image) VALUES(?,?,?,?,?)",
      [id, user.name || null, user.email || null, user.emailVerified?.toISOString() || null, user.image || null]
    );
    return { ...user, id };
  },
  async getUser(id: string) {
    return queryOne("SELECT * FROM User WHERE id=?", [id]);
  },
  async getUserByEmail(email: string) {
    return queryOne("SELECT * FROM User WHERE email=?", [email]);
  },
  async getUserByAccount({ provider, providerAccountId }: any) {
    return queryOne(
      "SELECT u.* FROM User u JOIN Account a ON u.id=a.userId WHERE a.provider=? AND a.providerAccountId=?",
      [provider, providerAccountId]
    );
  },
  async updateUser(user: any) {
    await execute("UPDATE User SET name=?,image=?,updatedAt=datetime('now') WHERE id=?",
      [user.name, user.image, user.id]);
    return user;
  },
  async linkAccount(account: any) {
    const id = Math.random().toString(36).slice(2);
    await execute(
      "INSERT OR IGNORE INTO Account(id,userId,type,provider,providerAccountId,refresh_token,access_token,expires_at,token_type,scope,id_token) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      [id, account.userId, account.type, account.provider, account.providerAccountId,
       account.refresh_token||null, account.access_token||null, account.expires_at||null,
       account.token_type||null, account.scope||null, account.id_token||null]
    );
    return account;
  },
  async createSession(session: any) {
    const id = Math.random().toString(36).slice(2);
    await execute("INSERT INTO Session(id,sessionToken,userId,expires) VALUES(?,?,?,?)",
      [id, session.sessionToken, session.userId, session.expires.toISOString()]);
    return session;
  },
  async getSessionAndUser(sessionToken: string) {
    const session = await queryOne<any>("SELECT * FROM Session WHERE sessionToken=?", [sessionToken]);
    if (!session) return null;
    const user = await queryOne<any>("SELECT * FROM User WHERE id=?", [session.userId]);
    if (!user) return null;
    return { session: { ...session, expires: new Date(session.expires) }, user };
  },
  async updateSession(session: any) {
    await execute("UPDATE Session SET expires=? WHERE sessionToken=?",
      [session.expires?.toISOString(), session.sessionToken]);
    return session;
  },
  async deleteSession(sessionToken: string) {
    await execute("DELETE FROM Session WHERE sessionToken=?", [sessionToken]);
  },
  async createVerificationToken(vt: any) {
    await execute("INSERT OR IGNORE INTO VerificationToken(identifier,token,expires) VALUES(?,?,?)",
      [vt.identifier, vt.token, vt.expires.toISOString()]);
    return vt;
  },
  async useVerificationToken({ identifier, token }: any) {
    const vt = await queryOne<any>("SELECT * FROM VerificationToken WHERE identifier=? AND token=?", [identifier, token]);
    if (!vt) return null;
    await execute("DELETE FROM VerificationToken WHERE identifier=? AND token=?", [identifier, token]);
    return vt;
  },
};

export const authOptions: NextAuthOptions = {
  adapter: SqlAdapter as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const dominios = (process.env.ALLOWED_DOMAINS ?? "").split(",").map(d => d.trim()).filter(Boolean);
      if (dominios.length === 0) return true; // se não configurado, permite todos (dev)
      const permitido = dominios.some(d => user.email?.endsWith(d));
      if (!permitido) return "/login?error=DomainNotAllowed";
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = user.id;
        const dbUser = await queryOne<any>("SELECT role FROM User WHERE id=?", [user.id]);
        (session.user as any).role = dbUser?.role ?? "VIEWER";
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "database" },
};
