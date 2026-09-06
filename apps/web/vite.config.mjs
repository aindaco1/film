import { defineConfig } from "vite";
import { webBundleBudgetPlugin } from "../../scripts/web-bundle-budget.mjs";

export default defineConfig({ plugins: [webBundleBudgetPlugin()] });
