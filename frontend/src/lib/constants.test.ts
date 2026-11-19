import { describe, expect, it } from "vitest";
import { AUDIO_TYPES, IMAGE_TYPES, validateFile } from "./constants";

const f = (name: string, type: string, mb: number) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: mb * 1024 * 1024 });
  return file;
};

describe("validateFile", () => {
  it("accepts a 5 MB JPEG photo", () =>
    expect(
      validateFile(f("a.jpg", "image/jpeg", 5), IMAGE_TYPES, 10),
    ).toBeNull());
  it("rejects a photo over 10 MB", () =>
    expect(
      validateFile(f("a.png", "image/png", 11), IMAGE_TYPES, 10),
    ).not.toBeNull());
  it("rejects a GIF photo", () =>
    expect(
      validateFile(f("a.gif", "image/gif", 1), IMAGE_TYPES, 10),
    ).not.toBeNull());
  it("accepts an M4A recording", () =>
    expect(
      validateFile(f("a.m4a", "audio/x-m4a", 20), AUDIO_TYPES, 50),
    ).toBeNull());
  it("rejects audio over 50 MB", () =>
    expect(
      validateFile(f("a.mp3", "audio/mpeg", 51), AUDIO_TYPES, 50),
    ).not.toBeNull());
});
