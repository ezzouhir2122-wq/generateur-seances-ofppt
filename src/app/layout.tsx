import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import { auth } from "@/auth";
import Providers from "@/components/ui/Providers";
import AppShell from "@/components/ui/AppShellV2";
import "./globals.css";
// CACHE_BUST_2026_07_12_SIMULATOR_V3

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

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
      <body className={`${font.variable} ${fontSerif.variable} font-sans`}>
        <Providers>
          <AppShell user={session?.user ?? null} claudeKey={claudeKey} openaiKey={openaiKey}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
