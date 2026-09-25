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

      const isDebug = nextUrl.pathname.startsWith("/api/debug-login") || nextUrl.pathname.startsWith("/api/debug-email");
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

      // Espace admin : réservé au rôle ADMIN
      const isAdminArea =
        nextUrl.pathname.startsWith("/admin") || nextUrl.pathname.startsWith("/api/admin");
      if (isAdminArea) {
        if (!isLoggedIn) return false;
        const role = (auth?.user as { role?: string } | undefined)?.role;
        if (role !== "ADMIN") return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
