import type { NextAuthConfig } from "next-auth";

// Config légère pour le Edge Runtime (middleware)
// Ne doit PAS importer Prisma ou bcrypt
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      const isDebug = nextUrl.pathname.startsWith("/api/debug-login");
      const isRegister = nextUrl.pathname.startsWith("/api/register");
      if (isApiAuth || isDebug || isRegister) return true;
      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
