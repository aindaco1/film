import { XMLParser, XMLValidator } from "fast-xml-parser";
import { normalizeScreenplayElementName } from "@film/schema";
import type {
  ProductionElement,
  SceneElementOccurrence,
  ScreenplayBreakdown,
  ScreenplayElementCategory,
  ScreenplayElementSource,
  ScreenplayFormat,
  ScreenplayScene,
} from "@film/schema";

export const SCREENPLAY_PARSER_VERSION = "film-screenplay-1";

const MAX_SOURCE_CHARS = 10 * 1024 * 1024;
const MAX_SOURCE_LINES = 100_000;
const MAX_SCENES = 1_000;
const MAX_ELEMENTS = 5_000;
const MAX_OCCURRENCES = 50_000;

export type ParseScreenplayInput = {
  projectId: string;
  path: string;
  kind: ScreenplayFormat;
  text: string;
  title?: string;
  sourceSizeBytes?: number;
  importedAt?: string;
};

type Detection = {
  category: ScreenplayElementCategory;
  name: string;
  source: ScreenplayElementSource;
  sourceLine: number;
  excerpt: string;
};

type SceneDraft = Omit<ScreenplayScene, "id" | "revisionId" | "ordinal"> & {
  detections: Detection[];
};

type ParsedDraft = {
  title: string | null;
  scenes: SceneDraft[];
  warnings: string[];
};

type FdxParagraph = {
  type: string;
  text: string;
  number: string | null;
  sourceLine: number;
};

type ParsedSceneHeading = NonNullable<ReturnType<typeof parseSceneHeading>>;

const INLINE_CATEGORY_ALIASES: Record<string, ScreenplayElementCategory> = {
  animal: "animal",
  animals: "animal",
  background: "background",
  bg: "background",
  cast: "cast",
  character: "cast",
  characters: "cast",
  equipment: "equipment",
  gear: "equipment",
  location: "location",
  locations: "location",
  makeup: "makeup",
  music: "music",
  other: "other",
  prop: "prop",
  props: "prop",
  sfx: "special_effect",
  sound: "sound",
  stunt: "stunt",
  stunts: "stunt",
  vehicle: "vehicle",
  vehicles: "vehicle",
  vfx: "visual_effect",
  wardrobe: "wardrobe",
};

export class ScreenplayParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenplayParseError";
  }
}

export function parseScreenplayFile(input: ParseScreenplayInput): ScreenplayBreakdown {
  const projectId = input.projectId.trim();
  const path = input.path.trim();
  if (!projectId) throw new ScreenplayParseError("A project is required for screenplay import.");
  if (!path) throw new ScreenplayParseError("The screenplay file name is missing.");

  const sourceText = normalizeSourceText(input.text);
  if (!sourceText.trim()) throw new ScreenplayParseError("The screenplay file is empty.");
  if (sourceText.length > MAX_SOURCE_CHARS) {
    throw new ScreenplayParseError("The screenplay exceeds the 10 MB local parsing limit.");
  }
  if (sourceText.split("\n").length > MAX_SOURCE_LINES) {
    throw new ScreenplayParseError("The screenplay exceeds the 100,000 line parsing limit.");
  }

  const parsed = input.kind === "fountain"
    ? parseFountain(sourceText)
    : parseFinalDraft(sourceText);
  const importedAt = input.importedAt ?? new Date().toISOString();
  const title = cleanDisplayName(input.title ?? parsed.title ?? inferTitle(path), 180) || "Untitled screenplay";
  const sourceHash = stableHash(`${projectId}\u0000${path}\u0000${sourceText}`);
  const revisionId = `screenplay_revision_${sourceHash}`;
  const warnings = [...parsed.warnings];
  const scenes = parsed.scenes.slice(0, MAX_SCENES).map((scene, index): ScreenplayScene => ({
    ...withoutDetections(scene),
    id: `screenplay_scene_${sourceHash}_${String(index + 1).padStart(4, "0")}`,
    revisionId,
    ordinal: index + 1,
  }));
  if (parsed.scenes.length > scenes.length) {
    warnings.push(`${parsed.scenes.length - scenes.length} scenes were omitted by the ${MAX_SCENES}-scene safety cap.`);
  }

  const { elements, occurrences } = materializeElements(projectId, revisionId, sourceHash, scenes, parsed.scenes, warnings);

  return {
    schemaVersion: 1,
    id: `screenplay_breakdown_${sourceHash}`,
    projectId,
    revision: {
      id: revisionId,
      projectId,
      title,
      format: input.kind,
      sourceFileName: path,
      sourceSizeBytes: input.sourceSizeBytes ?? new TextEncoder().encode(sourceText).byteLength,
      sourceText,
      importedAt,
      parserVersion: SCREENPLAY_PARSER_VERSION,
      warnings,
    },
    scenes,
    elements,
    occurrences,
    updatedAt: importedAt,
  };
}

function parseFountain(sourceText: string): ParsedDraft {
  const lines = sourceText.split("\n");
  const scenes: SceneDraft[] = [];
  const warnings: string[] = [];
  let current: { heading: ParsedSceneHeading; startLine: number; lines: string[] } | null = null;
  let title: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const heading = parseSceneHeading(line);
    if (heading) {
      if (current) scenes.push(buildFountainScene(current, index));
      current = { heading, startLine: index + 1, lines: [line] };
      continue;
    }

    if (!current) {
      const titleMatch = /^Title:\s*(.+)$/i.exec(line.trim());
      if (titleMatch?.[1] && !title) title = cleanDisplayName(titleMatch[1], 180);
      continue;
    }
    current.lines.push(line);
  }

  if (current) scenes.push(buildFountainScene(current, lines.length));
  if (scenes.length === 0) {
    warnings.push("No Fountain scene headings were found. Use standard INT./EXT. headings or force a heading with a leading period.");
  }
  return { title, scenes, warnings };
}

function buildFountainScene(
  current: { heading: ParsedSceneHeading; startLine: number; lines: string[] },
  endLine: number,
): SceneDraft {
  const detections = sceneHeadingDetections(current.heading, current.startLine);

  let synopsis: string | null = null;
  for (let index = 1; index < current.lines.length; index += 1) {
    const line = current.lines[index] ?? "";
    const absoluteLine = current.startLine + index;
    const trimmed = line.trim();
    if (!synopsis && /^=(?!=)\s*/.test(trimmed)) {
      synopsis = cleanDisplayName(trimmed.replace(/^=\s*/, ""), 500) || null;
    }
    if (isFountainCharacterCue(current.lines, index)) {
      detections.push(...characterCueDetections(trimmed, absoluteLine));
    }
    detections.push(...extractInlineDetections(line, absoluteLine));
  }

  return {
    sceneNumber: current.heading.sceneNumber,
    heading: current.heading.heading,
    interiorExterior: current.heading.interiorExterior,
    location: current.heading.location,
    timeOfDay: current.heading.timeOfDay,
    synopsis,
    sourceStartLine: current.startLine,
    sourceEndLine: Math.max(current.startLine, endLine),
    sourceText: current.lines.join("\n").trimEnd(),
    detections,
  };
}

function parseFinalDraft(sourceText: string): ParsedDraft {
  if (/<!DOCTYPE|<!ENTITY/i.test(sourceText)) {
    throw new ScreenplayParseError("Final Draft files containing DTD or entity declarations are not accepted.");
  }
  const validation = XMLValidator.validate(sourceText);
  if (validation !== true) {
    const message = typeof validation === "object" && validation && "err" in validation
      ? String((validation as { err?: { msg?: unknown } }).err?.msg ?? "invalid XML")
      : "invalid XML";
    throw new ScreenplayParseError(`Final Draft XML could not be parsed: ${message}.`);
  }

  let tree: unknown;
  try {
    tree = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      trimValues: false,
      parseTagValue: false,
      processEntities: false,
    }).parse(sourceText);
  } catch (error) {
    throw new ScreenplayParseError(`Final Draft XML could not be parsed: ${error instanceof Error ? error.message : "invalid XML"}.`);
  }

  const paragraphs = collectFdxParagraphs(tree);
  const scenes: SceneDraft[] = [];
  const warnings: string[] = [];
  let current: { heading: ParsedSceneHeading; number: string | null; startLine: number; paragraphs: FdxParagraph[] } | null = null;

  for (const paragraph of paragraphs) {
    if (normalizeFdxType(paragraph.type) === "scene heading") {
      if (current) scenes.push(buildFdxScene(current));
      const heading = parseSceneHeading(`.${paragraph.text}`) ?? {
        heading: cleanDisplayName(paragraph.text, 240),
        sceneNumber: paragraph.number,
        interiorExterior: null,
        location: cleanDisplayName(paragraph.text, 180) || null,
        timeOfDay: null,
      };
      current = {
        heading: { ...heading, sceneNumber: paragraph.number ?? heading.sceneNumber },
        number: paragraph.number,
        startLine: paragraph.sourceLine,
        paragraphs: [paragraph],
      };
      continue;
    }
    if (current) current.paragraphs.push(paragraph);
  }
  if (current) scenes.push(buildFdxScene(current));
  if (paragraphs.length === 0) warnings.push("No Final Draft content paragraphs were found.");
  if (scenes.length === 0) warnings.push("No Final Draft scene headings were found.");
  return { title: null, scenes, warnings };
}

function buildFdxScene(current: {
  heading: ParsedSceneHeading;
  number: string | null;
  startLine: number;
  paragraphs: FdxParagraph[];
}): SceneDraft {
  const detections = sceneHeadingDetections(current.heading, current.startLine);
  for (const paragraph of current.paragraphs) {
    if (normalizeFdxType(paragraph.type) === "character") {
      detections.push(...characterCueDetections(paragraph.text, paragraph.sourceLine));
    }
    detections.push(...extractInlineDetections(paragraph.text, paragraph.sourceLine));
  }

  const sourceText = current.paragraphs.map((paragraph) => paragraph.text).join("\n").trimEnd();
  return {
    sceneNumber: current.number ?? current.heading.sceneNumber,
    heading: current.heading.heading,
    interiorExterior: current.heading.interiorExterior,
    location: current.heading.location,
    timeOfDay: current.heading.timeOfDay,
    synopsis: null,
    sourceStartLine: current.startLine,
    sourceEndLine: current.paragraphs.at(-1)?.sourceLine ?? current.startLine,
    sourceText,
    detections,
  };
}

function collectFdxParagraphs(tree: unknown): FdxParagraph[] {
  const paragraphs: FdxParagraph[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;

    const node = value as Record<string, unknown>;
    if ("Paragraph" in node) {
      const attributes = asRecord(node[":@"]);
      const text = cleanXmlText(collectXmlText(node.Paragraph));
      paragraphs.push({
        type: readXmlAttribute(attributes, "Type") ?? "Action",
        text,
        number: readXmlAttribute(attributes, "Number"),
        sourceLine: paragraphs.length + 1,
      });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== ":@") visit(child);
    }
  };
  visit(tree);
  return paragraphs;
}

function materializeElements(
  projectId: string,
  revisionId: string,
  sourceHash: string,
  scenes: ScreenplayScene[],
  drafts: SceneDraft[],
  warnings: string[],
): { elements: ProductionElement[]; occurrences: SceneElementOccurrence[] } {
  const elements: ProductionElement[] = [];
  const occurrences: SceneElementOccurrence[] = [];
  const elementsByKey = new Map<string, ProductionElement>();

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    const draft = drafts[sceneIndex];
    if (!scene || !draft) continue;
    for (const detection of draft.detections) {
      if (occurrences.length >= MAX_OCCURRENCES) break;
      const name = cleanDisplayName(detection.name, 180);
      const normalizedName = normalizeScreenplayElementName(name);
      if (!name || !normalizedName) continue;
      const key = `${detection.category}:${normalizedName}`;
      let element = elementsByKey.get(key);
      if (!element) {
        if (elements.length >= MAX_ELEMENTS) continue;
        element = {
          id: `production_element_${sourceHash}_${stableHash(key)}`,
          projectId,
          revisionId,
          category: detection.category,
          name,
          normalizedName,
          source: detection.source,
          reviewState: "suggested",
        };
        elementsByKey.set(key, element);
        elements.push(element);
      }
      occurrences.push({
        id: `scene_element_${stableHash(`${scene.id}:${element.id}:${detection.sourceLine}:${detection.excerpt}`)}`,
        sceneId: scene.id,
        elementId: element.id,
        sourceLine: detection.sourceLine,
        excerpt: cleanDisplayName(detection.excerpt, 240),
        reviewState: "suggested",
      });
    }
  }
  if (elements.length >= MAX_ELEMENTS) warnings.push(`Additional elements were omitted by the ${MAX_ELEMENTS}-element safety cap.`);
  if (occurrences.length >= MAX_OCCURRENCES) warnings.push(`Additional occurrences were omitted by the ${MAX_OCCURRENCES}-occurrence safety cap.`);
  return { elements, occurrences };
}

function parseSceneHeading(line: string): {
  heading: string;
  sceneNumber: string | null;
  interiorExterior: string | null;
  location: string | null;
  timeOfDay: string | null;
} | null {
  const raw = line.trim();
  if (!raw) return null;
  const forced = raw.startsWith(".") && !raw.startsWith("..");
  const candidate = forced ? raw.slice(1).trim() : raw;
  const standardPrefix = /^(?:INT\.?\/?EXT\.?|EXT\.?\/?INT\.?|INT\/EXT|EXT\/INT|I\/E|INT|EXT|EST)\.?\s+/i.test(candidate);
  if (!forced && (!standardPrefix || candidate !== candidate.toUpperCase())) return null;

  const numberMatch = /\s+#([^#]+)#\s*$/.exec(candidate);
  const sceneNumber = numberMatch?.[1]?.trim() || null;
  const heading = cleanDisplayName(numberMatch ? candidate.slice(0, numberMatch.index) : candidate, 240);
  if (!heading) return null;
  const prefixMatch = /^(INT\.?\/?EXT\.?|EXT\.?\/?INT\.?|INT\/EXT|EXT\/INT|I\/E|INT|EXT|EST)\.?\s*/i.exec(heading);
  const interiorExterior = prefixMatch?.[1]
    ? prefixMatch[1].toUpperCase().replaceAll(".", "")
    : null;
  const remainder = prefixMatch ? heading.slice(prefixMatch[0].length).trim() : heading;
  const timeSeparator = remainder.lastIndexOf(" - ");
  const location = cleanDisplayName(timeSeparator >= 0 ? remainder.slice(0, timeSeparator) : remainder, 180) || null;
  const timeOfDay = timeSeparator >= 0
    ? cleanDisplayName(remainder.slice(timeSeparator + 3), 80) || null
    : null;
  return { heading, sceneNumber, interiorExterior, location, timeOfDay };
}

function isFountainCharacterCue(lines: string[], index: number): boolean {
  const raw = (lines[index] ?? "").trim();
  if (!raw || raw.length > 100 || parseSceneHeading(raw)) return false;
  const forced = raw.startsWith("@");
  const candidate = forced ? raw.slice(1).trim() : raw.replace(/\^$/, "").trim();
  if (!forced && candidate !== candidate.toUpperCase()) return false;
  if (/^(?:FADE|CUT|DISSOLVE|SMASH CUT|MATCH CUT).*(?:TO:)?$/.test(candidate)) return false;
  if (candidate.endsWith(":")) return false;

  let nextIndex = index + 1;
  while (nextIndex < lines.length && /^\s*\([^)]*\)\s*$/.test(lines[nextIndex] ?? "")) nextIndex += 1;
  const next = (lines[nextIndex] ?? "").trim();
  if (!next || parseSceneHeading(next)) return false;
  return next !== next.toUpperCase() || /[.!?,;'"-]/.test(next);
}

function extractInlineDetections(line: string, sourceLine: number): Detection[] {
  const detections: Detection[] = [];
  for (const match of line.matchAll(/\[\[\s*([a-z][a-z _-]*)\s*:\s*([^\]]+)\]\]/gi)) {
    const alias = match[1]?.toLowerCase().trim().replace(/[ _-]+/g, "_") ?? "";
    const category = INLINE_CATEGORY_ALIASES[alias];
    const name = cleanDisplayName(match[2] ?? "", 180);
    if (!category || !name) continue;
    detections.push({ category, name, source: "inline_tag", sourceLine, excerpt: match[0] });
  }
  return detections;
}

function sceneHeadingDetections(heading: ParsedSceneHeading, sourceLine: number): Detection[] {
  return heading.location
    ? [{
      category: "location",
      name: heading.location,
      source: "scene_heading",
      sourceLine,
      excerpt: heading.heading,
    }]
    : [];
}

function characterCueDetections(value: string, sourceLine: number): Detection[] {
  const character = cleanCharacterCue(value);
  return character
    ? [{
      category: "cast",
      name: character,
      source: "character_cue",
      sourceLine,
      excerpt: value.trim(),
    }]
    : [];
}

function cleanCharacterCue(value: string): string {
  return cleanDisplayName(
    value.replace(/^@/, "").replace(/\^$/, "").replace(/\s*\([^)]*\)\s*$/, ""),
    100,
  );
}

function withoutDetections(scene: SceneDraft): Omit<SceneDraft, "detections"> {
  const { detections: _detections, ...rest } = scene;
  return rest;
}

function normalizeSourceText(value: string): string {
  return value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
}

function cleanDisplayName(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function inferTitle(path: string): string {
  const name = path.replaceAll("\\", "/").split("/").at(-1) ?? path;
  return name.replace(/\.(?:fountain|fdx)$/i, "");
}

function normalizeFdxType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanXmlText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
}

function collectXmlText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => collectXmlText(item)).join("");
  if (!value || typeof value !== "object") return typeof value === "string" ? value : "";
  const node = value as Record<string, unknown>;
  if (typeof node["#text"] === "string") return node["#text"];
  return Object.entries(node)
    .filter(([key]) => key !== ":@")
    .map(([, child]) => collectXmlText(child))
    .join("");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readXmlAttribute(attributes: Record<string, unknown>, name: string): string | null {
  const value = attributes[`@_${name}`] ?? attributes[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stableHash(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b1;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x5bd1e995);
  }
  return `${(left >>> 0).toString(36).padStart(7, "0")}${(right >>> 0).toString(36).padStart(7, "0")}`;
}
