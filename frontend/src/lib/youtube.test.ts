import { describe, expect, it } from "vitest";
import { extractYouTubeId } from "./youtube";

describe("extractYouTubeId", () => {
  it("reads watch URLs", () =>
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=ukLnPbIffxE&t=3"),
    ).toBe("ukLnPbIffxE"));
  it("reads youtu.be short URLs", () =>
    expect(extractYouTubeId("https://youtu.be/Tt08KmFfIYQ?si=x")).toBe(
      "Tt08KmFfIYQ",
    ));
  it("reads Shorts URLs", () =>
    expect(extractYouTubeId("https://youtube.com/shorts/abcdefghijk")).toBe(
      "abcdefghijk",
    ));
  it("reads embed URLs", () =>
    expect(extractYouTubeId("https://www.youtube.com/embed/abcdefghijk")).toBe(
      "abcdefghijk",
    ));
  it("rejects other sites", () =>
    expect(extractYouTubeId("https://vimeo.com/12345678901")).toBeNull());
  it("rejects malformed IDs", () =>
    expect(extractYouTubeId("https://youtube.com/watch?v=short")).toBeNull());
});
