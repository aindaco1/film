import assert from "node:assert/strict";
import test from "node:test";
import { createStoredZip } from "./zip-fixture.mjs";

test("createStoredZip writes a bounded UTF-8 archive directory", () => {
  const zip = createStoredZip([
    { path: "Tasks.csv", content: "Name\nImport task\n" },
    { path: "Notes/Plan.md", content: "# Plan" },
  ]);
  const endOffset = zip.length - 22;

  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(endOffset), 0x06054b50);
  assert.equal(zip.readUInt16LE(endOffset + 8), 2);
  assert.equal(zip.readUInt16LE(endOffset + 10), 2);
  assert.match(zip.toString("utf8"), /Tasks\.csv/);
  assert.match(zip.toString("utf8"), /Notes\/Plan\.md/);
});
