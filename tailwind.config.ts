import type { Config } from "tailwindcss";

const config: Config = {
  // Add this line right here:
  darkMode: "class", 
  
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // your existing theme extensions...
    },
  },
  plugins: [],
};
export default config;