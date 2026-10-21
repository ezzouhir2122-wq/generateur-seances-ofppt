import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import { getUserAiKeys } from "@/lib/user-ai-key";
import { auth } from "@/auth";
import Providers from "@/components/ui/Providers";
import AppShell from "@/components/shell";
import InstallBanner from "@/components/pwa/InstallBanner";
import "./globals.css";

// Police variable : on omet `weight` → un seul fichier couvre toutes les graisses (200–800)
const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#003087",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.competencia.one"),
  title: "Competencia IA",
  description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Competencia IA",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-192.png",
  },
  // Aperçu affiché quand le lien est partagé sur WhatsApp / réseaux sociaux
  openGraph: {
    type: "website",
    siteName: "Competencia IA",
    title: "Competencia IA",
    description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
    url: "https://www.competencia.one",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "Competencia IA — OFPPT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Competencia IA",
    description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // L'indicateur reflète les clés DU FORMATEUR connecté, pas celles du serveur.
  const keys = session?.user?.id ? await getUserAiKeys(session.user.id) : null;
  const claudeKey = !!keys?.claude;
  const openaiKey = !!keys?.openai;

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
