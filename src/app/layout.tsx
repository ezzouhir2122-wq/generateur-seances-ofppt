import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/auth";
import Providers from "@/components/ui/Providers";
import AppShell from "@/components/ui/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Competencia IA",
  description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const claudeKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes("remplacer");
  const openaiKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("remplacer");

  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <AppShell user={session?.user ?? null} claudeKey={claudeKey} openaiKey={openaiKey}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
