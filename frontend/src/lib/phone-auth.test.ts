import { describe, expect, it } from "vitest";
import { phoneCredentials, signupCredentials, toE164 } from "./phone-auth";

describe("phone and password accounts", () => {
  it("joins with full name, phone and password without an email", () => {
    expect(
      signupCredentials("  Student Name  ", "0912345678", "example-password"),
    ).toEqual({
      phone: "+251912345678",
      password: "example-password",
      fullName: "Student Name",
    });
  });
  it("signs in using only phone and password", () => {
    expect(phoneCredentials("0912345678", "example-password")).toEqual({
      phone: "+251912345678",
      password: "example-password",
    });
  });
  it("requires a full name to join", () => {
    expect(() =>
      signupCredentials("  ", "0912345678", "example-password"),
    ).toThrow();
  });
  it("requires signup passwords to be at least eight characters", () => {
    expect(() =>
      signupCredentials("Student Name", "0912345678", "short"),
    ).toThrow();
  });
  it("caps passwords at 128 characters", () => {
    expect(() => phoneCredentials("0912345678", "x".repeat(129))).toThrow();
  });
  it("uses the same account for local and international phone formatting", () => {
    expect(toE164("09 1234 5678")).toBe(toE164("+251912345678"));
  });
});
