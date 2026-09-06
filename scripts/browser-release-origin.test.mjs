import assert from "node:assert/strict";
import { test } from "node:test";
import { browserReleaseOrigin } from "./browser-release-origin.mjs";

test("release browser checks require an explicit origin and use their own bounded suite", () => {
  assert.equal(browserReleaseOrigin(["--built"]), null);
  assert.equal(browserReleaseOrigin(["--release-origin", "https://film.example"]), "https://film.example/");
  assert.equal(browserReleaseOrigin(["--release-origin", "http://127.0.0.1:4173/"]), "http://127.0.0.1:4173/");
  assert.throws(() => browserReleaseOrigin(["--release-origin", "https://film.example", "--offline-only"]), /Unknown argument/);
});

test("release browser origin rejects credentials, private URL state, non-origin paths, and insecure remote HTTP", () => {
  for (const value of ["https://name:password@film.example", "https://film.example/?token=private", "https://film.example/#token", "https://film.example/project", "http://film.example", "file:///tmp/index.html", "not-a-url"]) {
    assert.throws(() => browserReleaseOrigin(["--release-origin", value]));
  }
  assert.throws(() => browserReleaseOrigin(["--release-origin"]), /requires a value/);
});
