import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware Edge Runtime — utilise uniquement authConfig sans Prisma
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|woff|woff2)).*)"],
};
