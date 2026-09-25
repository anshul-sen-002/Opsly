import { describe, expect, it } from "vitest";
import { isValidPhone } from "./validation";

describe("isValidPhone", () => {
  it("rejects short numbers like 56", () => {
    expect(isValidPhone("56")).toBe(false);
    expect(isValidPhone("1")).toBe(false);
    expect(isValidPhone("123456")).toBe(false);
  });

  it("rejects empty and nullish values", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("   ")).toBe(false);
    expect(isValidPhone(null)).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
  });

  it("rejects non-numeric junk", () => {
    expect(isValidPhone("call-me")).toBe(false);
    expect(isValidPhone("98765abcde")).toBe(false);
    expect(isValidPhone("12/34/5678")).toBe(false);
  });

  it("rejects strings padded to length but with too few digits", () => {
    expect(isValidPhone("(12) 34-56")).toBe(false);
  });

  it("rejects values that are too long", () => {
    expect(isValidPhone("123456789012345678901")).toBe(false);
  });

  it("accepts plain digit runs of 7 to 20 characters", () => {
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("1234567")).toBe(true);
  });

  it("accepts common international formats", () => {
    expect(isValidPhone("+1 555 000 1234")).toBe(true);
    expect(isValidPhone("(555) 123-4567")).toBe(true);
    expect(isValidPhone("020-7946-0958")).toBe(true);
    expect(isValidPhone("+91 98765 43210")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isValidPhone("  +1 555 000 1234  ")).toBe(true);
  });
});
