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

      // Flux mot de passe oublié / réinitialisation : publics
      const isPublicAuthFlow =
        nextUrl.pathname.startsWith("/mot-de-passe-oublie") ||
        nextUrl.pathname.startsWith("/reinitialiser-mot-de-passe") ||
        nextUrl.pathname.startsWith("/api/auth/forgot-password") ||
        nextUrl.pathname.startsWith("/api/auth/reset-password") ||
        nextUrl.pathname.startsWith("/api/auth/login-status");
      if (isPublicAuthFlow) return true;

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Espace admin : le middleware Edge ne voit pas le rôle de façon fiable
      // (callback session par défaut). On exige seulement d'être connecté ici ;
      // le rôle ADMIN est vérifié côté serveur, garde autoritaire :
      //  - page /admin : requireAdmin() → redirect("/") pour un non-admin
      //  - routes /api/admin/* : requireAdmin() → 403
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
