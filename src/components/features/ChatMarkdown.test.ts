import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChatMarkdown, { normalizeMath } from "./ChatMarkdown";

const render = (content: string) => renderToStaticMarkup(createElement(ChatMarkdown, { content }));

describe("normalizeMath", () => {
  it("turns \\( \\) into inline $$ and \\[ \\] into a display block", () => {
    expect(normalizeMath("learns \\(P(y \\mid x)\\) here")).toBe("learns $$P(y \\mid x)$$ here");
    expect(normalizeMath("so \\[ L = \\|x - \\hat{x}\\|^2 \\] holds")).toBe("so \n$$\nL = \\|x - \\hat{x}\\|^2\n$$\n holds");
  });

  it("leaves code spans and fenced code alone", () => {
    const md = "use `\\(x\\)` and\n```\nprint('\\(y\\)')\n```\nbut \\(z\\)";
    expect(normalizeMath(md)).toBe("use `\\(x\\)` and\n```\nprint('\\(y\\)')\n```\nbut $$z$$");
  });

  it("leaves dollar amounts as text", () => {
    expect(normalizeMath("costs $5 and $10")).toBe("costs $5 and $10");
  });
});

describe("ChatMarkdown", () => {
  it("renders bold, lists and tables instead of showing the symbols", () => {
    const html = render("**Key point**\n\n- one\n- two\n\n| A | B |\n|---|---|\n| x | y |");
    expect(html).toContain("<strong");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<table");
    expect(html).not.toContain("**");
    expect(html).not.toContain("|---|");
  });

  it("renders LaTeX with KaTeX", () => {
    const html = render("Conditional probability \\(P(y \\mid x)\\).");
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("\\(");
  });

  it("does not render raw HTML from the model", () => {
    const html = render('<img src=x onerror="alert(1)"> hi');
    expect(html).not.toContain("<img");
  });

  it("drops javascript: links", () => {
    expect(render("[click](javascript:alert(1))")).not.toContain("javascript:");
  });
});
