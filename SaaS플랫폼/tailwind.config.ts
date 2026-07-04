import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        line: "#dbe2ea",
        panel: "#f8fafc"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 33, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
