import type { NotionExportContentFile, NotionExportFile, NotionExportImportFile } from "@film/importers";
import { copyBytesToArrayBuffer } from "./binary-buffer";

export type BrowserImportFile = File & {
  webkitRelativePath?: string;
};

export type BrowserNotionImportFile = NotionExportImportFile & {
  readBlob?: () => Promise<Blob>;
};

export type NotionZipEntry = {
  path: string;
  sizeBytes: number;
  compressedSizeBytes: number;
  crc32: number;
  contentType?: string;
  compressionMethod: number;
  dataOffset: number;
};

export type OpenedNotionZip = {
  fileName: string;
  sizeBytes: number;
  entries: NotionZipEntry[];
  data: ArrayBuffer;
};

const MAX_ZIP_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_IMPORT_ENTRY_BYTES = 25 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 5_000;
const MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;
const MAX_ZIP_COMPRESSION_RATIO = 200;
const ZIP_COMPRESSION_RATIO_ALLOWANCE_BYTES = 1024 * 1024;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_MAX_COMMENT_BYTES = 65_535;
const ASSET_EXTENSIONS = new Set([
  ".aiff",
  ".doc",
  ".docx",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".json",
  ".m4a",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".svg",
  ".tif",
  ".tiff",
  ".txt",
  ".wav",
  ".webp",
  ".xlsx",
]);

export function createNotionManifest(files: Iterable<BrowserImportFile>): NotionExportFile[] {
  return [...files].map((file) => ({
    path: file.webkitRelativePath || file.name,
    sizeBytes: file.size,
    contentType: file.type || undefined,
  }));
}

export async function readNotionImportFiles(
  files: Iterable<BrowserImportFile>,
  allowedPaths?: ReadonlySet<string>,
): Promise<BrowserNotionImportFile[]> {
  const importFiles: BrowserNotionImportFile[] = [];
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    if (allowedPaths && !allowedPaths.has(path.trim())) continue;
    const base = {
      path,
      sizeBytes: file.size,
      contentType: file.type || undefined,
    };

    if (!isSafeImportPath(path) || file.size > MAX_IMPORT_ENTRY_BYTES) {
      importFiles.push(base);
      continue;
    }

    if (isAssetImportFile(path)) {
      importFiles.push({
        ...base,
        readBlob: async () => file,
      });
      continue;
    }

    if (!isTextImportFile(path)) {
      importFiles.push(base);
      continue;
    }

    importFiles.push({
      ...base,
      text: await file.text(),
    });
  }
  return importFiles;
}

export async function readNotionContentFiles(files: Iterable<BrowserImportFile>): Promise<NotionExportContentFile[]> {
  const contentFiles = (await readNotionImportFiles(files)).filter(
    (file): file is NotionExportContentFile => typeof file.text === "string",
  );

  return contentFiles;
}

export async function openNotionZip(file: File): Promise<OpenedNotionZip> {
  if (file.size > MAX_ZIP_ARCHIVE_BYTES) {
    throw new Error("Notion ZIP is larger than the local importer limit.");
  }

  const data = await file.arrayBuffer();
  const entries = parseZipEntries(data);

  return {
    fileName: file.name,
    sizeBytes: file.size,
    entries,
    data,
  };
}

export function createNotionZipManifest(zip: OpenedNotionZip): NotionExportFile[] {
  return zip.entries.map((entry) => ({
    path: entry.path,
    sizeBytes: entry.sizeBytes,
    contentType: entry.contentType,
  }));
}

export async function readNotionZipImportFiles(
  zip: OpenedNotionZip,
  allowedPaths?: ReadonlySet<string>,
): Promise<BrowserNotionImportFile[]> {
  const files: BrowserNotionImportFile[] = [];
  for (const entry of zip.entries) {
    if (allowedPaths && !allowedPaths.has(entry.path.trim())) continue;
    const base = {
      path: entry.path,
      sizeBytes: entry.sizeBytes,
      contentType: entry.contentType,
    };

    if (!isSafeImportPath(entry.path) || entry.sizeBytes > MAX_IMPORT_ENTRY_BYTES) {
      files.push(base);
      continue;
    }

    if (isAssetImportFile(entry.path)) {
      files.push({
        ...base,
        readBlob: async () => new Blob([copyBytesToArrayBuffer(await readZipEntryBytes(zip.data, entry))], { type: entry.contentType }),
      });
      continue;
    }

    if (!isTextImportFile(entry.path)) {
      files.push(base);
      continue;
    }

    const bytes = await readZipEntryBytes(zip.data, entry);
    files.push({
      ...base,
      text: new TextDecoder().decode(bytes),
    });
  }
  return files;
}

function isTextImportFile(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized.endsWith(".md") || normalized.endsWith(".csv");
}

function isAssetImportFile(path: string): boolean {
  const normalized = path.toLowerCase();
  return ASSET_EXTENSIONS.has(normalized.slice(normalized.lastIndexOf(".")));
}

function parseZipEntries(data: ArrayBuffer): NotionZipEntry[] {
  const view = new DataView(data);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) {
    throw new Error("Selected file is not a readable ZIP archive.");
  }

  const diskNumber = view.getUint16(eocdOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(eocdOffset + 6, true);
  const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new Error("Multi-disk ZIP archives are not supported.");
  }
  if (totalEntries > MAX_ZIP_ENTRIES) {
    throw new Error("Notion ZIP contains too many entries.");
  }
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (
    !Number.isSafeInteger(centralDirectoryEnd)
    || centralDirectoryOffset > eocdOffset
    || centralDirectoryEnd !== eocdOffset
  ) {
    throw new Error("ZIP central directory bounds are invalid.");
  }

  const entries: NotionZipEntry[] = [];
  const paths = new Set<string>();
  let totalUncompressedBytes = 0;
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > centralDirectoryEnd) {
      throw new Error("ZIP central directory is truncated.");
    }
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error("ZIP central directory is malformed.");
    }

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const crc32 = view.getUint32(offset + 16, true);
    const compressedSizeBytes = view.getUint32(offset + 20, true);
    const sizeBytes = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const path = readUtf8(data, offset + 46, fileNameLength);
    const nextOffset = offset + 46 + fileNameLength + extraLength + commentLength;

    if (nextOffset > centralDirectoryEnd) {
      throw new Error("ZIP central directory entry exceeds its declared bounds.");
    }
    if ((flags & 0x1) === 0x1) {
      throw new Error("Encrypted ZIP entries are not supported.");
    }
    if (diskStart !== 0) {
      throw new Error("Multi-disk ZIP entries are not supported.");
    }
    if (sizeBytes === 0xffffffff || compressedSizeBytes === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 Notion exports are not supported yet.");
    }
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${path}.`);
    }
    if (compressionMethod === 0 && compressedSizeBytes !== sizeBytes) {
      throw new Error(`Stored ZIP entry size mismatch for ${path}.`);
    }
    if (
      sizeBytes > compressedSizeBytes * MAX_ZIP_COMPRESSION_RATIO + ZIP_COMPRESSION_RATIO_ALLOWANCE_BYTES
    ) {
      throw new Error(`ZIP compression ratio exceeds the importer limit for ${path}.`);
    }

    totalUncompressedBytes += sizeBytes;
    if (!Number.isSafeInteger(totalUncompressedBytes) || totalUncompressedBytes > MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("Notion ZIP uncompressed data exceeds the local importer limit.");
    }

    if (!path.endsWith("/")) {
      const pathKey = path.normalize("NFC");
      if (paths.has(pathKey)) {
        throw new Error(`Notion ZIP contains a duplicate path: ${path}.`);
      }
      paths.add(pathKey);
      const dataOffset = findZipEntryDataOffset(
        view,
        data,
        localHeaderOffset,
        path,
        compressionMethod,
        flags,
      );
      if (dataOffset + compressedSizeBytes > centralDirectoryOffset) {
        throw new Error(`ZIP entry data exceeds archive bounds for ${path}.`);
      }
      entries.push({
        path,
        sizeBytes,
        compressedSizeBytes,
        crc32,
        contentType: inferContentType(path),
        compressionMethod,
        dataOffset,
      });
    }

    offset = nextOffset;
  }

  if (offset !== centralDirectoryEnd) {
    throw new Error("ZIP central directory size does not match its entries.");
  }

  return entries;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - ZIP_MAX_COMMENT_BYTES - 22);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (
      view.getUint32(offset, true) === ZIP_EOCD_SIGNATURE
      && offset + 22 + view.getUint16(offset + 20, true) === view.byteLength
    ) {
      return offset;
    }
  }
  return -1;
}

function findZipEntryDataOffset(
  view: DataView,
  data: ArrayBuffer,
  localHeaderOffset: number,
  centralPath: string,
  centralCompressionMethod: number,
  centralFlags: number,
): number {
  if (localHeaderOffset + 30 > view.byteLength) {
    throw new Error("ZIP local file header is truncated.");
  }
  if (view.getUint32(localHeaderOffset, true) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error("ZIP local file header is malformed.");
  }

  const flags = view.getUint16(localHeaderOffset + 6, true);
  const compressionMethod = view.getUint16(localHeaderOffset + 8, true);
  const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength;
  if (dataOffset > view.byteLength) {
    throw new Error("ZIP local file header exceeds archive bounds.");
  }
  if ((flags & 0x1) === 0x1) {
    throw new Error("Encrypted ZIP entries are not supported.");
  }
  if (flags !== centralFlags) {
    throw new Error(`ZIP local and central flags do not match for ${centralPath}.`);
  }
  if (compressionMethod !== centralCompressionMethod) {
    throw new Error(`ZIP compression metadata mismatch for ${centralPath}.`);
  }
  const localPath = readUtf8(data, localHeaderOffset + 30, fileNameLength);
  if (localPath !== centralPath) {
    throw new Error(`ZIP local and central paths do not match for ${centralPath}.`);
  }
  return dataOffset;
}

export async function readZipEntryBytes(data: ArrayBuffer, entry: NotionZipEntry): Promise<Uint8Array> {
  const compressed = data.slice(entry.dataOffset, entry.dataOffset + entry.compressedSizeBytes);
  let bytes: Uint8Array;
  if (entry.compressionMethod === 0) {
    bytes = new Uint8Array(compressed);
  } else if (entry.compressionMethod === 8) {
    bytes = await inflateRaw(compressed, entry.sizeBytes);
  } else {
    throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.path}.`);
  }
  if (bytes.byteLength !== entry.sizeBytes) {
    throw new Error(`ZIP entry size does not match its manifest for ${entry.path}.`);
  }
  if (crc32(bytes) !== entry.crc32) {
    throw new Error(`ZIP entry checksum failed for ${entry.path}.`);
  }
  return bytes;
}

async function inflateRaw(data: ArrayBuffer, expectedBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress Notion ZIP entries.");
  }

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > expectedBytes || total > MAX_IMPORT_ENTRY_BYTES) {
      await reader.cancel();
      throw new Error("ZIP entry expanded beyond its declared importer limit.");
    }
    chunks.push(value);
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

const CRC32_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function readUtf8(data: ArrayBuffer, offset: number, length: number): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(data.slice(offset, offset + length));
}

function isSafeImportPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\") || trimmed.startsWith("/")) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(trimmed)) {
    return false;
  }

  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return false;
  }
  return segments[0] !== "__MACOSX";
}

function inferContentType(path: string): string | undefined {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const types: Record<string, string> = {
    aiff: "audio/aiff",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    gif: "image/gif",
    heic: "image/heic",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    json: "application/json",
    m4a: "audio/mp4",
    md: "text/markdown",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    pdf: "application/pdf",
    png: "image/png",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    svg: "image/svg+xml",
    tif: "image/tiff",
    tiff: "image/tiff",
    txt: "text/plain",
    wav: "audio/wav",
    webp: "image/webp",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return types[extension];
}
