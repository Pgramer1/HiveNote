import { describe, expect, it } from "vitest";
import { fileExtension, isResourcePublicId, newResourcePublicId } from "./upload-limits";

describe("fileExtension", () => {
  it("returns the lowercase extension", () => {
    expect(fileExtension("Notes.PDF")).toBe("pdf");
    expect(fileExtension("week.3.slides.pptx")).toBe("pptx");
  });

  it("returns null when there is no extension", () => {
    expect(fileExtension("README")).toBeNull();
    expect(fileExtension(".pdf")).toBeNull();
  });
});

describe("newResourcePublicId", () => {
  it("leaves PDFs without an extension and keeps it for slides", () => {
    expect(newResourcePublicId("PDF", "pdf")).toMatch(/^\d+-[a-z0-9]+$/);
    expect(newResourcePublicId("PPT", "pptx")).toMatch(/^\d+-[a-z0-9]+\.pptx$/);
  });

  it("produces ids the server-side check accepts", () => {
    expect(isResourcePublicId(`hivenote-resources/${newResourcePublicId("PDF", "pdf")}`)).toBe(true);
    expect(isResourcePublicId(`hivenote-resources/${newResourcePublicId("PPT", "ppt")}`)).toBe(true);
  });
});

describe("isResourcePublicId", () => {
  it("accepts ids in the shape the signature action issues", () => {
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y")).toBe(true);
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y.ppt")).toBe(true);
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y.pptx")).toBe(true);
  });

  it("rejects other folders, path tricks and other file types", () => {
    expect(isResourcePublicId("other-folder/1760000000000-k23v51y")).toBe(false);
    // .pdf URLs are blocked by the Cloudinary account, so we never issue them.
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y.pdf")).toBe(false);
    expect(isResourcePublicId("hivenote-resources/../secret/1-a.pdf")).toBe(false);
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y.exe")).toBe(false);
    expect(isResourcePublicId("hivenote-resources/1760000000000-k23v51y.pdf/extra")).toBe(false);
  });
});
