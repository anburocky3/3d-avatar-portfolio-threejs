import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/3d-avatar-portfolio-threejs/",
  plugins: [tailwindcss()],
});
