import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { initSchema, upsertUser } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const provisional = (user.id as string | undefined) ?? token.sub ?? user.email ?? "";
        token.userId = provisional;
        if (user.email) {
          try {
            await initSchema();
            const canonical = await upsertUser({
              id: provisional,
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
            });
            token.userId = canonical;
          } catch (err) {
            console.error("[auth] upsertUser failed:", (err as Error).message);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as typeof session.user & { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}
