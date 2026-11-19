import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./app-auth.server";

describe("app-managed password hashes", () => {
  it("verifies the chosen password without storing it in plaintext", async () => {
    const password = "a-long-example-password";
    const encoded = await hashPassword(password);

    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("incorrect-password", encoded)).resolves.toBe(false);
    await expect(verifyPassword(password, null)).resolves.toBe(false);
  });
});
