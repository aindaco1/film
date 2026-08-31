import { describe, expect, it } from "vitest";
import { copyBytesToArrayBuffer } from "../src/binary-buffer";

describe("browser byte buffers", () => {
  it("copies views into a standalone ArrayBuffer for Blob and Web Crypto contracts", () => {
    const source = new Uint8Array([10, 20, 30, 40]);
    const view = source.subarray(1, 3);
    const buffer = copyBytesToArrayBuffer(view);

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(buffer)]).toEqual([20, 30]);
    source[1] = 99;
    expect([...new Uint8Array(buffer)]).toEqual([20, 30]);
  });
});
