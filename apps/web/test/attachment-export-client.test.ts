import { describe, expect, it } from "vitest";
import {
  createStoredAttachmentPackageDryRun,
  downloadStoredAttachmentPackage,
  downloadStoredAttachmentObject,
  exportStoredAttachmentManifest,
  readStoredAttachmentPackageObjects,
  readStoredAttachmentPackageManifest,
} from "../src/attachment-export-client";

describe("attachment export client", () => {
  it("requests a stored R2 attachment manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/attachments/r2/export-manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({ workspaceId: "workspace_acme", limit: 25, offset: 5 }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_attachment_intents",
          workspaceId: "workspace_acme",
          exportPolicy: "stored_r2_manifest_only",
          offset: 5,
          nextOffset: null,
          rowCount: 1,
          truncated: false,
          objects: [
            {
              docId: "doc_poster",
              objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
              name: "Poster.png",
              sourcePath: "Feature/Poster.png",
              sizeBytes: 12,
              contentType: "image/png",
              sha256: "a".repeat(64),
              committedAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const manifest = await exportStoredAttachmentManifest(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      25,
      5,
      fetcher,
    );

    expect(manifest.objects).toHaveLength(1);
    expect(manifest.exportPolicy).toBe("stored_r2_manifest_only");
    expect(manifest.offset).toBe(5);
  });

  it("downloads a stored attachment object with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe(
        "https://worker.test/api/attachments/r2/object?workspaceId=workspace_acme&objectKey=workspaces%2Fworkspace_acme%2Fattachments%2Fdoc_poster%2Fposter.png",
      );
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({ "x-film-csrf": "csrf_1234567890" });

      return new Response("poster bytes", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition": "attachment; filename=\"Poster.png\"",
          "x-film-doc-id": "doc_poster",
          "x-film-sha256": "a".repeat(64),
        },
      });
    };

    const result = await downloadStoredAttachmentObject(
      "https://worker.test",
      "workspace_acme",
      "workspaces/workspace_acme/attachments/doc_poster/poster.png",
      "csrf_1234567890",
      fetcher,
    );

    expect(result.filename).toBe("Poster.png");
    expect(result.docId).toBe("doc_poster");
    expect(result.sha256).toHaveLength(64);
    expect(await result.blob.text()).toBe("poster bytes");
  });

  it("requests a stored attachment package dry run with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/attachments/r2/export-package-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        limit: 1000,
        objectKeys: ["workspaces/workspace_acme/attachments/doc_poster/poster.png"],
        offset: 0,
      }));

      return new Response(
        JSON.stringify({
          dryRun: true,
          persistence: "d1_attachment_intents",
          workspaceId: "workspace_acme",
          packagePolicy: "stored_r2_attachment_package_plan",
          packageMode: "zip_download_ready",
          packagePlanId: "attachment_package_123",
          packageToken: "pkg_12345678901234567890",
          packageTokenExpiresAt: "2026-07-08T00:15:00.000Z",
          packagePlanPersistence: "d1_attachment_package_plans",
          byteSource: "r2_binding_available",
          offset: 0,
          nextOffset: null,
          objectCount: 1,
          totalSizeBytes: 12,
          truncated: false,
          canPackage: true,
          destructiveWrite: false,
          blockers: [],
          objects: [
            {
              docId: "doc_poster",
              objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
              name: "Poster.png",
              sizeBytes: 12,
              sha256: "a".repeat(64),
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await createStoredAttachmentPackageDryRun(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      1000,
      ["workspaces/workspace_acme/attachments/doc_poster/poster.png"],
      0,
      fetcher,
    );

    expect(result.packagePolicy).toBe("stored_r2_attachment_package_plan");
    expect(result.objectCount).toBe(1);
    expect(result.canPackage).toBe(true);
    expect(result.packagePlanId).toBe("attachment_package_123");
    expect(result.packageToken).toBe("pkg_12345678901234567890");
  });

  it("downloads a stored attachment package with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/attachments/r2/package");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify({
        workspaceId: "workspace_acme",
        limit: 1000,
        objectKeys: ["workspaces/workspace_acme/attachments/doc_poster/poster.png"],
        packagePlanId: "attachment_package_123",
        packageToken: "pkg_12345678901234567890",
      }));

      return new Response("zip bytes", {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": "attachment; filename=\"film-attachments-workspace_acme.zip\"",
          "x-film-package-object-count": "1",
          "x-film-package-total-source-bytes": "12",
          "x-film-package-sha256": "a".repeat(64),
          "x-film-audit-persistence": "d1_audit_events",
        },
      });
    };

    const result = await downloadStoredAttachmentPackage(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      1000,
      ["workspaces/workspace_acme/attachments/doc_poster/poster.png"],
      "attachment_package_123",
      "pkg_12345678901234567890",
      fetcher,
    );

    expect(result.filename).toBe("film-attachments-workspace_acme.zip");
    expect(result.objectCount).toBe(1);
    expect(result.totalSourceBytes).toBe(12);
    expect(result.sha256).toHaveLength(64);
    expect(result.auditPersistence).toBe("d1_audit_events");
    expect(await result.blob.text()).toBe("zip bytes");
  });

  it("reads the non-secret manifest from a downloaded attachment package ZIP", async () => {
    const packageManifest = {
      format: "film.attachment-package",
      version: 1,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-08T00:00:00.000Z",
      objectCount: 1,
      totalSourceBytes: 12,
      objects: [
        {
          path: "attachments/001-doc_poster-Poster.png",
          docId: "doc_poster",
          objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
          name: "Poster.png",
          sourcePath: "Feature/Poster.png",
          sizeBytes: 12,
          contentType: "image/png",
          sha256: "a".repeat(64),
          committedAt: "2026-07-08T00:00:00.000Z",
        },
      ],
    };
    const zipBytes = createZip([
      {
        path: "manifest.json",
        text: JSON.stringify(packageManifest),
      },
      {
        path: "attachments/001-doc_poster-Poster.png",
        bytes: new Uint8Array([1, 2, 3]),
      },
    ]);

    const manifest = await readStoredAttachmentPackageManifest(new Blob([zipBytes], { type: "application/zip" }));

    expect(manifest).toEqual(packageManifest);
  });

  it("extracts and verifies attachment package object bytes", async () => {
    const objectBytes = new TextEncoder().encode("verified attachment bytes");
    const digest = await crypto.subtle.digest("SHA-256", objectBytes);
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const objectPath = "attachments/001-doc_poster-Poster.png";
    const manifest = {
      format: "film.attachment-package" as const,
      version: 1 as const,
      workspaceId: "workspace_acme",
      objectCount: 1,
      totalSourceBytes: objectBytes.byteLength,
      objects: [{
        path: objectPath,
        docId: "doc_poster",
        objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        name: "Poster.png",
        sizeBytes: objectBytes.byteLength,
        contentType: "image/png",
        sha256,
      }],
    };
    const zipBytes = createZip([
      { path: "manifest.json", text: JSON.stringify(manifest) },
      { path: objectPath, bytes: objectBytes },
    ]);

    const objects = await readStoredAttachmentPackageObjects(
      new Blob([zipBytes], { type: "application/zip" }),
      manifest,
    );

    expect(objects).toHaveLength(1);
    expect(objects[0].manifest.sha256).toBe(sha256);
    expect(new Uint8Array(await objects[0].blob.arrayBuffer())).toEqual(objectBytes);
  });

  it("throws worker errors for blocked attachment export paths", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "missing_csrf" }), { status: 403 });

    await expect(
      exportStoredAttachmentManifest("https://worker.test", "workspace_acme", "", 10, 0, fetcher),
    ).rejects.toThrow("missing_csrf");
  });
});

type ZipTestEntry = {
  path: string;
  text?: string;
  bytes?: Uint8Array;
};

function createZip(entries: ZipTestEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const path = encoder.encode(entry.path);
    const rawBytes = entry.bytes ?? encoder.encode(entry.text ?? "");
    const checksum = crc32(rawBytes);
    const localHeader = new Uint8Array(30 + path.length + rawBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, rawBytes.length, true);
    localView.setUint32(22, rawBytes.length, true);
    localView.setUint16(26, path.length, true);
    localHeader.set(path, 30);
    localHeader.set(rawBytes, 30 + path.length);
    locals.push(localHeader);

    const centralHeader = new Uint8Array(46 + path.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, rawBytes.length, true);
    centralView.setUint32(24, rawBytes.length, true);
    centralView.setUint16(28, path.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(path, 46);
    centrals.push(centralHeader);

    localOffset += localHeader.length;
  }

  const centralDirectory = concatBytes(centrals);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectory.length, true);
  eocdView.setUint32(16, localOffset, true);

  return concatBytes([...locals, centralDirectory, eocd]);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}
