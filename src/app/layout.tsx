import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import { auth } from "@/auth";
import Providers from "@/components/ui/Providers";
import AppShell from "@/components/shell";
import InstallBanner from "@/components/pwa/InstallBanner";
import "./globals.css";

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

export const viewport: Viewport = {
  themeColor: "#003087",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Competencia IA",
  description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Competencia IA",
  },
  icons: {
    apple: "/logo-ofppt.jpg",
    icon: "/icon.svg",
  },
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
          <InstallBanner />
        </Providers>
      </body>
    </html>
  );
}
