import { describe, expect, it } from "vitest";
import { detectUniversityFromEmail, isUniversityEmail } from "./universities";

describe("detectUniversityFromEmail", () => {
  it("matches a registered domain case-insensitively", () => {
    expect(detectUniversityFromEmail("Student@AdaniUni.ac.in")?.id).toBe("adani");
  });

  it("matches subdomains of a registered domain", () => {
    expect(detectUniversityFromEmail("student@cse.adaniuni.ac.in")?.id).toBe("adani");
  });

  it("rejects other domains", () => {
    expect(detectUniversityFromEmail("someone@gmail.com")).toBeNull();
    expect(isUniversityEmail("someone@gmail.com")).toBe(false);
  });

  it("rejects look-alike domains that merely end with the same letters", () => {
    expect(detectUniversityFromEmail("attacker@notadaniuni.ac.in")).toBeNull();
    expect(detectUniversityFromEmail("attacker@evil-adaniuni.ac.in")).toBeNull();
  });
});
