/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        canvas: "#f7f8fc",
        brand: "#5b5bd6",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
}
