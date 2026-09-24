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
      const isBienvenue = nextUrl.pathname.startsWith("/bienvenue");
      // Fichiers PWA : doivent rester publics, sinon l'installation échoue
      // (manifeste et service worker inaccessibles pour un formateur non connecté)
      const isPwaAsset =
        nextUrl.pathname === "/manifest.webmanifest" ||
        nextUrl.pathname === "/sw.js" ||
        nextUrl.pathname.startsWith("/icon");
      if (isApiAuth || isDebug || isRegister || isBienvenue || isPwaAsset) return true;
      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
