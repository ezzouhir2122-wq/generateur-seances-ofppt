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
      },
    },
  },
  plugins: [],
};

export default config;
