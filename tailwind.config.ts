import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ofppt: {
          teal: "#0B6B72",
          tealhover: "#0D7E88",
          tealdark: "#084F57",
          navy: "#1B3A6E",
          green: "#0B6B72",
          lightgreen: "#0D7E88",
          gold: "#C8A84B",
          dark: "#1a1a2e",
        },
        dark: {
          base: "#0A0A0F",
          surface: "#111116",
          raised: "#17171E",
          input: "#1A1A24",
          border: "#1E1E2C",
        },
        accent: {
          DEFAULT: "#84CC16",
          hover: "#65A30D",
          muted: "#84CC1620",
        },
      },
    },
  },
  plugins: [],
};

export default config;
