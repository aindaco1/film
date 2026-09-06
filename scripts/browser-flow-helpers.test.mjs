import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { revealForm } from "./browser-flow-helpers.mjs";

test("form revelation waits for an asynchronously mounted closed disclosure", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(2_000);
    await page.setContent('<main id="fixture"></main>');
    const form = page.locator("form");
    const revealing = revealForm(form);
    // Model the app's async startup: navigation finishes before the form mounts.
    await page.waitForTimeout(50);
    await page.locator("#fixture").evaluate((container) => {
      container.innerHTML = '<details><summary>Sign in</summary><form><input name="email"></form></details>';
    });
    await revealing;
    await form.locator("input").fill("owner@example.com");
    assert.equal(await form.isVisible(), true);
    assert.equal(await form.locator("input").inputValue(), "owner@example.com");
  } finally {
    await browser.close();
  }
});
