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
          green: "#006633",
          lightgreen: "#009944",
          gold: "#C8A84B",
          dark: "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
