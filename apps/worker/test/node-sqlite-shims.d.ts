declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:path" {
  const path: {
    resolve(...paths: string[]): string;
    dirname(path: string): string;
    join(...paths: string[]): string;
  };
  export default path;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare module "node:sqlite" {
  type SqliteValue = string | number | bigint | null | Uint8Array;
  type RunResult = { changes: number | bigint };
  type Statement = {
    get(...bindings: SqliteValue[]): Record<string, unknown> | undefined;
    all(...bindings: SqliteValue[]): Record<string, unknown>[];
    run(...bindings: SqliteValue[]): RunResult;
  };
  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }
}
