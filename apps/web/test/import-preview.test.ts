import { describe, expect, it } from "vitest";
import {
  createNotionManifest,
  createNotionZipManifest,
  openNotionZip,
  readNotionContentFiles,
  readNotionImportFiles,
  readNotionZipImportFiles,
  type BrowserImportFile,
} from "../src/import-preview";

describe("Notion browser import helpers", () => {
  it("creates a Notion manifest without reading file contents", () => {
    const files = [
      {
        name: "Tasks.csv",
        webkitRelativePath: "Notion Export/Tasks.csv",
        size: 1200,
        type: "text/csv",
      },
      {
        name: "Treatment.md",
        size: 500,
        type: "",
      },
    ] as BrowserImportFile[];

    expect(createNotionManifest(files)).toEqual([
      {
        path: "Notion Export/Tasks.csv",
        sizeBytes: 1200,
        contentType: "text/csv",
      },
      {
        path: "Treatment.md",
        sizeBytes: 500,
        contentType: undefined,
      },
    ]);
  });

  it("reads only Markdown and CSV files for import", async () => {
    const files = [
      {
        name: "Treatment.md",
        size: 11,
        type: "text/markdown",
        text: async () => "# Treatment",
      },
      {
        name: "Tasks.csv",
        size: 15,
        type: "text/csv",
        text: async () => "Name\nTask",
      },
      {
        name: "Poster.png",
        size: 4,
        type: "image/png",
        text: async () => {
          throw new Error("image content should not be read");
        },
      },
      {
        name: "Huge.csv",
        size: 26 * 1024 * 1024,
        type: "text/csv",
        text: async () => {
          throw new Error("oversized content should not be read");
        },
      },
    ] as BrowserImportFile[];

    await expect(readNotionImportFiles(files)).resolves.toEqual([
      {
        path: "Treatment.md",
        sizeBytes: 11,
        contentType: "text/markdown",
        text: "# Treatment",
      },
      {
        path: "Tasks.csv",
        sizeBytes: 15,
        contentType: "text/csv",
        text: "Name\nTask",
      },
      {
        path: "Poster.png",
        sizeBytes: 4,
        contentType: "image/png",
        readBlob: expect.any(Function),
      },
      {
        path: "Huge.csv",
        sizeBytes: 26 * 1024 * 1024,
        contentType: "text/csv",
      },
    ]);

    await expect(readNotionContentFiles(files)).resolves.toEqual([
      {
        path: "Treatment.md",
        sizeBytes: 11,
        contentType: "text/markdown",
        text: "# Treatment",
      },
      {
        path: "Tasks.csv",
        sizeBytes: 15,
        contentType: "text/csv",
        text: "Name\nTask",
      },
    ]);
  });

  it("reads only preflight candidates and reads folder text sequentially", async () => {
    let activeReads = 0;
    let maxActiveReads = 0;
    const textReader = (text: string) => async (): Promise<string> => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeReads -= 1;
      return text;
    };
    const files = [
      { name: "Projects.csv", size: 20, type: "text/csv", text: textReader("Name\nFilm\n") },
      { name: "Tasks.csv", size: 20, type: "text/csv", text: textReader("Name\nTask\n") },
      {
        name: "Unplanned.md",
        size: 20,
        type: "text/markdown",
        text: async () => {
          throw new Error("unplanned content should not be read");
        },
      },
    ] as BrowserImportFile[];

    const imported = await readNotionImportFiles(files, new Set(["Projects.csv", "Tasks.csv"]));

    expect(imported.map((file) => file.path)).toEqual(["Projects.csv", "Tasks.csv"]);
    expect(maxActiveReads).toBe(1);
  });

  it("does not read HTML exports or binary attachment text during browser import", async () => {
    const files = [
      {
        name: "Unsafe.html",
        size: 45,
        type: "text/html",
        text: async () => {
          throw new Error("HTML content should not be read");
        },
      },
      {
        name: "Release.pdf",
        size: 1024,
        type: "application/pdf",
        text: async () => {
          throw new Error("binary attachment text should not be read");
        },
      },
    ] as BrowserImportFile[];

    await expect(readNotionImportFiles(files)).resolves.toEqual([
      {
        path: "Unsafe.html",
        sizeBytes: 45,
        contentType: "text/html",
      },
      {
        path: "Release.pdf",
        sizeBytes: 1024,
        contentType: "application/pdf",
        readBlob: expect.any(Function),
      },
    ]);
    await expect(readNotionContentFiles(files)).resolves.toEqual([]);
  });

  it("opens a Notion ZIP manifest and reads text entries after preflight", async () => {
    const zipBytes = await createZip([
      {
        path: "Imported Feature/Projects.csv",
        text: "Name,Phase\nImported Feature,Pre-Production\n",
        compressionMethod: 8,
      },
      {
        path: "Imported Feature/Treatment.md",
        text: "# Treatment",
        compressionMethod: 0,
      },
      {
        path: "Imported Feature/Poster.png",
        bytes: new Uint8Array([1, 2, 3, 4]),
        compressionMethod: 0,
      },
    ]);
    const zip = await openNotionZip(new File([zipBytes], "notion-export.zip", { type: "application/zip" }));

    expect(createNotionZipManifest(zip)).toEqual([
      {
        path: "Imported Feature/Projects.csv",
        sizeBytes: 43,
        contentType: "text/csv",
      },
      {
        path: "Imported Feature/Treatment.md",
        sizeBytes: 11,
        contentType: "text/markdown",
      },
      {
        path: "Imported Feature/Poster.png",
        sizeBytes: 4,
        contentType: "image/png",
      },
    ]);
    await expect(readNotionZipImportFiles(zip)).resolves.toEqual([
      {
        path: "Imported Feature/Projects.csv",
        sizeBytes: 43,
        contentType: "text/csv",
        text: "Name,Phase\nImported Feature,Pre-Production\n",
      },
      {
        path: "Imported Feature/Treatment.md",
        sizeBytes: 11,
        contentType: "text/markdown",
        text: "# Treatment",
      },
      {
        path: "Imported Feature/Poster.png",
        sizeBytes: 4,
        contentType: "image/png",
        readBlob: expect.any(Function),
      },
    ]);
    await expect(
      readNotionZipImportFiles(zip, new Set(["Imported Feature/Treatment.md"])),
    ).resolves.toEqual([
      {
        path: "Imported Feature/Treatment.md",
        sizeBytes: 11,
        contentType: "text/markdown",
        text: "# Treatment",
      },
    ]);
  });

  it("does not inflate unsafe or HTML ZIP entries as import text", async () => {
    const zipBytes = await createZip([
      {
        path: "../Secrets.csv",
        text: "Name\nShould not be read\n",
        compressionMethod: 8,
      },
      {
        path: "Imported Feature/Unsafe.html",
        text: "<script>alert('xss')</script>",
        compressionMethod: 8,
      },
      {
        path: "Imported Feature/Release.pdf",
        bytes: new Uint8Array([5, 6, 7, 8]),
        compressionMethod: 8,
      },
    ]);
    const zip = await openNotionZip(new File([zipBytes], "malicious-notion-export.zip", { type: "application/zip" }));

    await expect(readNotionZipImportFiles(zip)).resolves.toEqual([
      {
        path: "../Secrets.csv",
        sizeBytes: 24,
        contentType: "text/csv",
      },
      {
        path: "Imported Feature/Unsafe.html",
        sizeBytes: 29,
        contentType: undefined,
      },
      {
        path: "Imported Feature/Release.pdf",
        sizeBytes: 4,
        contentType: "application/pdf",
        readBlob: expect.any(Function),
      },
    ]);
  });

  it("rejects duplicate paths and forged archive entry counts", async () => {
    const duplicateZip = await createZip([
      { path: "Imported Feature/Tasks.csv", text: "Name\nOne\n", compressionMethod: 8 },
      { path: "Imported Feature/Tasks.csv", text: "Name\nTwo\n", compressionMethod: 8 },
    ]);
    await expect(
      openNotionZip(new File([duplicateZip], "duplicate-paths.zip", { type: "application/zip" })),
    ).rejects.toThrow("duplicate path");

    const forgedCountZip = (await createZip([
      { path: "Imported Feature/Tasks.csv", text: "Name\nOne\n", compressionMethod: 0 },
    ])).slice();
    const forgedCountView = dataView(forgedCountZip);
    const forgedCountEocd = forgedCountZip.byteLength - 22;
    forgedCountView.setUint16(forgedCountEocd + 8, 5_001, true);
    forgedCountView.setUint16(forgedCountEocd + 10, 5_001, true);
    await expect(
      openNotionZip(new File([forgedCountZip], "forged-count.zip", { type: "application/zip" })),
    ).rejects.toThrow("too many entries");
  });

  it("rejects local and central header disagreement", async () => {
    const zipBytes = (await createZip([
      { path: "Imported Feature/Treatment.md", text: "# Treatment", compressionMethod: 0 },
    ])).slice();
    zipBytes[30] = "X".charCodeAt(0);

    await expect(
      openNotionZip(new File([zipBytes], "header-mismatch.zip", { type: "application/zip" })),
    ).rejects.toThrow("local and central paths do not match");

    const flagMismatchZip = (await createZip([
      { path: "Imported Feature/Treatment.md", text: "# Treatment", compressionMethod: 0 },
    ])).slice();
    dataView(flagMismatchZip).setUint16(6, 0x0008, true);
    await expect(
      openNotionZip(new File([flagMismatchZip], "flag-mismatch.zip", { type: "application/zip" })),
    ).rejects.toThrow("local and central flags do not match");
  });

  it("rejects invalid UTF-8 ZIP paths", async () => {
    const zipBytes = (await createZip([
      { path: "Imported Feature/Treatment.md", text: "# Treatment", compressionMethod: 0 },
    ])).slice();
    const centralOffset = centralDirectoryOffset(zipBytes);
    zipBytes[30] = 0xff;
    zipBytes[centralOffset + 46] = 0xff;

    await expect(
      openNotionZip(new File([zipBytes], "invalid-utf8.zip", { type: "application/zip" })),
    ).rejects.toThrow();
  });

  it("rejects excessive ZIP compression ratios before inflation", async () => {
    const zipBytes = await createZip([
      {
        path: "Imported Feature/Bomb.csv",
        bytes: new Uint8Array(2 * 1024 * 1024),
        compressionMethod: 8,
      },
    ]);

    await expect(
      openNotionZip(new File([zipBytes], "compression-bomb.zip", { type: "application/zip" })),
    ).rejects.toThrow("compression ratio exceeds");
  });

  it("bounds inflated output and verifies entry checksums", async () => {
    const oversizedOutputZip = (await createZip([
      {
        path: "Imported Feature/Lied Size.csv",
        bytes: new Uint8Array(1024 * 1024),
        compressionMethod: 8,
      },
    ])).slice();
    const oversizedView = dataView(oversizedOutputZip);
    const oversizedCentral = centralDirectoryOffset(oversizedOutputZip);
    oversizedView.setUint32(22, 512 * 1024, true);
    oversizedView.setUint32(oversizedCentral + 24, 512 * 1024, true);
    const openedOversized = await openNotionZip(
      new File([oversizedOutputZip], "lied-size.zip", { type: "application/zip" }),
    );
    await expect(readNotionZipImportFiles(openedOversized)).rejects.toThrow("expanded beyond its declared");

    const checksumZip = (await createZip([
      { path: "Imported Feature/Treatment.md", text: "# Treatment", compressionMethod: 0 },
    ])).slice();
    const checksumDataOffset = 30 + new TextEncoder().encode("Imported Feature/Treatment.md").byteLength;
    checksumZip[checksumDataOffset] ^= 0xff;
    const openedChecksum = await openNotionZip(
      new File([checksumZip], "checksum.zip", { type: "application/zip" }),
    );
    await expect(readNotionZipImportFiles(openedChecksum)).rejects.toThrow("checksum failed");
  });
});

type ZipTestEntry = {
  path: string;
  text?: string;
  bytes?: Uint8Array;
  compressionMethod: 0 | 8;
};

async function createZip(entries: ZipTestEntry[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const path = encoder.encode(entry.path);
    const rawBytes = entry.bytes ?? encoder.encode(entry.text ?? "");
    const compressedBytes = entry.compressionMethod === 8 ? await deflateRaw(rawBytes) : rawBytes;
    const checksum = crc32(rawBytes);
    const localHeader = new Uint8Array(30 + path.length + compressedBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, entry.compressionMethod, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, compressedBytes.length, true);
    localView.setUint32(22, rawBytes.length, true);
    localView.setUint16(26, path.length, true);
    localHeader.set(path, 30);
    localHeader.set(compressedBytes, 30 + path.length);
    locals.push(localHeader);

    const centralHeader = new Uint8Array(46 + path.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, entry.compressionMethod, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, compressedBytes.length, true);
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

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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

function dataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function centralDirectoryOffset(bytes: Uint8Array): number {
  return dataView(bytes).getUint32(bytes.byteLength - 22 + 16, true);
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
