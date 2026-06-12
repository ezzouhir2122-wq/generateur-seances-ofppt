import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        /* Design tokens — charte OFPPT (bleu dominant) */
        accent: {
          DEFAULT: "#0A4DA8",   // bleu interactif primaire
          hover:   "#083C82",
          dim:     "rgba(10,77,168,0.10)",
          glow:    "rgba(10,77,168,0.22)",
          orange:  "#E8651A",   // accent secondaire
        },
        blue: {
          DEFAULT: "#003087",   // bleu marine institutionnel
          dim:     "rgba(0,48,135,0.12)",
          glow:    "rgba(0,48,135,0.25)",
        },
        amber: {
          DEFAULT: "#F59E0B",
          dim:     "rgba(245,158,11,0.10)",
        },
        /* Palette OFPPT */
        ofppt: {
          orange:     "#E8651A",
          navy:       "#003087",
          blue:       "#0A4DA8",
          green:      "#003087",   // alias historique → repointé navy (titres/liens)
          lightgreen: "#FFA05C",
          gold:       "#C8A84B",
          teal:       "#0B6B72",
          dark:       "#003087",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        accent: "0 4px 24px rgba(10,77,168,0.22)",
        sm:     "0 1px 4px rgba(0,0,0,0.07)",
        md:     "0 4px 20px rgba(0,0,0,0.10)",
        lg:     "0 12px 48px rgba(0,0,0,0.14)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      letterSpacing: {
        tight:  "-0.03em",
        tighter: "-0.04em",
        label:  "0.07em",
        cap:    "0.10em",
      },
      animation: {
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
