import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f8f5",
        foreground: "#16352c",
        border: "#d7e5de",
        primary: "#1D9E75",
        muted: "#edf4f0",
        card: "#ffffff",
        category: {
          eda: "#3988ff",
          wc: "#1D9E75",
          ee: "#d88a18",
          im: "#7d57c1",
          ie: "#e16d43",
          iid: "#7d8d2e",
        },
      },
      boxShadow: {
        panel: "0 18px 54px rgba(21, 50, 40, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
