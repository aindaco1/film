import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("shared appearance contract", () => {
  it("defines every theme token referenced by app and legal styles", async () => {
    const sources = await Promise.all(["public/theme.css", "src/styles.css", "public/legal.css"].map((file) => readFile(file, "utf8")));
    const defined = new Set([...sources.join("\n").matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    const referenced = new Set([...sources.join("\n").matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]));
    expect([...referenced].filter((token) => !defined.has(token))).toEqual([]);
  });

  it("keeps component and legal colors in the shared palette", async () => {
    for (const file of ["src/styles.css", "public/legal.css"]) {
      const css = await readFile(file, "utf8");
      expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);
      expect(css).not.toMatch(/color-scheme\s*:/);
    }
  });

  it("loads appearance before rendering on every public entry point", async () => {
    for (const file of ["index.html", "public/privacy.html", "public/terms.html", "public/sms.html", "public/data-deletion.html"]) {
      const html = await readFile(file, "utf8");
      const head = html.slice(0, html.indexOf("</head>"));
      expect(head).toContain('name="color-scheme" content="light dark"');
      expect(head).toContain('href="/theme.css"');
      expect(head).toContain('src="/appearance.js"');
      expect(head.indexOf('href="/theme.css"')).toBeLessThan(head.indexOf('src="/appearance.js"'));
    }
  });

  it("includes appearance in the offline shell without copying it into project state", async () => {
    const worker = await readFile("public/service-worker.js", "utf8");
    expect(worker).toContain('"/theme.css"');
    expect(worker).toContain('"/appearance.js"');
    const app = await readFile("src/main.ts", "utf8");
    expect(app).not.toContain('"film.appearance.v1"');
    expect(app.match(/<select data-appearance/g)).toHaveLength(1);
  });
});
