import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("migration validation creates its database parent in a clean checkout", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "film-migrations-"));
  const databasePath = join(scratch, "missing", "nested", "migration-check.sqlite");

  try {
    const { stdout } = await execFileAsync(process.execPath, ["scripts/check-migrations.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FILM_MIGRATION_CHECK_DATABASE_PATH: databasePath,
      },
      timeout: 30_000,
    });
    assert.match(stdout, /Migrations validated with .* over 2 fresh passes/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
