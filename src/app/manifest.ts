import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Competencia IA",
    short_name: "Competencia",
    description: "Générez des séances pédagogiques OFPPT avec l'IA",
    start_url: "/",
    display: "standalone",
    background_color: "#003087",
    theme_color: "#003087",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo-ofppt.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: "/logo-ofppt.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
