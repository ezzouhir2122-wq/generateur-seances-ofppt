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
        /* Design tokens — map to CSS vars */
        accent: {
          DEFAULT: "#39C84A",
          hover:   "#2FB340",
          dim:     "rgba(57,200,74,0.10)",
          glow:    "rgba(57,200,74,0.22)",
        },
        blue: {
          DEFAULT: "#1F5DDB",
          dim:     "rgba(31,93,219,0.12)",
          glow:    "rgba(31,93,219,0.25)",
        },
        dark: {
          base:    "#08080D",
          surface: "#0E0E16",
          raised:  "#14141E",
          overlay: "#1A1A26",
          input:   "#0C0C14",
          border:  "rgba(255,255,255,0.055)",
        },
        amber: {
          DEFAULT: "#F59E0B",
          dim:     "rgba(245,158,11,0.10)",
        },
        /* Legacy OFPPT palette */
        ofppt: {
          teal:       "#0B6B72",
          tealhover:  "#0D7E88",
          tealdark:   "#084F57",
          navy:       "#1B3A6E",
          green:      "#0B6B72",
          lightgreen: "#0D7E88",
          gold:       "#C8A84B",
          dark:       "#1a1a2e",
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
        accent: "0 4px 24px rgba(57,200,74,0.22)",
        sm:     "0 1px 4px rgba(0,0,0,0.45)",
        md:     "0 4px 20px rgba(0,0,0,0.55)",
        lg:     "0 12px 48px rgba(0,0,0,0.65)",
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
