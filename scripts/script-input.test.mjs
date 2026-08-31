import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedInteger,
  normalizeSecureHttpBaseUrl,
  parseCliArgs,
  parseEnvFile,
} from "./script-input.mjs";

test("shared script input parses bounded CLI and environment values", () => {
  assert.deepEqual(parseCliArgs(["--strict", "--origin", "https://film.example"], {
    booleans: ["--strict"],
    values: ["--origin"],
  }), { strict: true, origin: "https://film.example" });
  assert.throws(() => parseCliArgs(["--origin"], { values: ["--origin"] }), /requires a value/);
  assert.throws(() => parseCliArgs(["--unknown"]), /Unknown argument/);

  const env = parseEnvFile("# ignored\nFILM_MODE='live'\nINVALID-NAME=skip\nFILM_URL=https://film.example/path\n");
  assert.equal(env.get("FILM_MODE"), "live");
  assert.equal(env.get("FILM_URL"), "https://film.example/path");
  assert.equal(env.has("INVALID-NAME"), false);

  assert.equal(boundedInteger("24", 1, 1, 720, "hours"), 24);
  assert.equal(boundedInteger(undefined, 24, 1, 720, "hours"), 24);
  assert.throws(() => boundedInteger("721", 24, 1, 720, "hours"), /Invalid hours/);
});

test("shared script input permits HTTPS and loopback HTTP only", () => {
  assert.equal(normalizeSecureHttpBaseUrl("https://film.example/api/", "origin"), "https://film.example/api");
  assert.equal(normalizeSecureHttpBaseUrl("http://127.0.0.1:8787/", "origin"), "http://127.0.0.1:8787");
  assert.throws(() => normalizeSecureHttpBaseUrl("http://film.example", "origin"), /HTTPS or local HTTP/);
});
