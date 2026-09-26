import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import { verifyPassword } from "@/lib/auth-timing";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await verifyPassword(password, user?.password);
        if (!user || !valid) return null;

        if (user.status !== "APPROVED") {
          throw new CredentialsSignin(
            user.status === "REJECTED" ? "AccountRejected"
            : user.status === "SUSPENDED" ? "AccountSuspended"
            : "AccountPending"
          );
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          matricule: user.matricule ?? null,
          etablissement: user.etablissement ?? null,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.matricule = user.matricule ?? null;
        token.etablissement = user.etablissement ?? null;
        token.role = user.role ?? token.role ?? "FORMATEUR";
        token.status = user.status ?? token.status ?? "APPROVED";
      }
      if (trigger === "update" && session) {
        token.matricule = session.user?.matricule ?? token.matricule;
        token.etablissement = session.user?.etablissement ?? token.etablissement;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.name = token.name as string;
      session.user.matricule = token.matricule ?? null;
      session.user.etablissement = token.etablissement ?? null;
      session.user.role = (token.role as string) ?? "FORMATEUR";
      session.user.status = (token.status as string) ?? "APPROVED";
      return session;
    },
  },
});
