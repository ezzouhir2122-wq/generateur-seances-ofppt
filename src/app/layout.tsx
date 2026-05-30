import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import Providers from "@/components/ui/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Générateur Séances OFPPT",
  description: "Générez des séances pédagogiques OFPPT en quelques secondes",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="fr">
      <body className={inter.className}>
        <header className="bg-ofppt-green text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ofppt-gold rounded-full flex items-center justify-center font-bold text-ofppt-green text-sm">
                  O
                </div>
                <span className="font-semibold text-lg">Générateur Séances OFPPT</span>
              </div>
              {session?.user && (
                <nav className="flex gap-1">
                  <Link
                    href="/"
                    className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Nouvelle séance
                  </Link>
                  <Link
                    href="/historique"
                    className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Mes séances
                  </Link>
                </nav>
              )}
            </div>

            {session?.user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/80">
                  {session.user.name ?? session.user.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-white/70 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1 rounded-lg transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <Providers>
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
