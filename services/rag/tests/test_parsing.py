import shutil

import pymupdf
import pytest

from app.cleaning import normalize_whitespace, remove_repeated_edges
from app.parsing import UnsupportedDocument, parse_document
from app.parsing import pdf as pdf_module
from tests.conftest import LEFT, RIGHT


def squash(text: str) -> str:
    return " ".join(text.split())


class TestCleaning:
    def test_rejoins_words_hyphenated_across_lines(self):
        assert normalize_whitespace("primary clus-\ntering") == "primary clustering"

    def test_collapses_spaces_and_blank_lines(self):
        assert normalize_whitespace("a   b\n\n\n\nc") == "a b\n\nc"

    def test_removes_footer_repeated_with_changing_page_numbers(self):
        titles = ["Arrays", "Lists", "Trees", "Graphs"]
        pages = [f"{t}\nbody text {i}\nCS201 Notes - Page {i}" for i, t in enumerate(titles, start=1)]
        cleaned = remove_repeated_edges(pages)
        assert all("Page" not in p for p in cleaned)
        # Short pages: the middle line is body text even though its number also rises.
        assert all(f"body text {i}" in p and t in p for i, (t, p) in enumerate(zip(titles, cleaned), start=1))

    def test_removes_identical_running_header(self):
        pages = [f"CS201 Data Structures\nTopic {t}\nline a\nline b\nline c\nline d\nend {t}" for t in "ABCD"]
        assert all(not p.startswith("CS201") for p in remove_repeated_edges(pages))

    def test_keeps_numbered_titles_that_do_not_follow_page_numbers(self):
        pages = ["Unit 3\nA", "Unit 3\nB", "Unit 7\nC", "Unit 1\nD", "Unit 9\nE"]
        assert remove_repeated_edges(pages) == pages

    def test_keeps_lines_that_do_not_repeat_enough(self):
        pages = ["Intro\nA", "Other\nB", "Third\nC", "Fourth\nD", "Intro\nE"]
        assert remove_repeated_edges(pages) == pages


class TestPdf:
    def test_headings_become_sections(self, lecture_pdf):
        doc = parse_document(lecture_pdf, "PDF")
        assert [b.section for b in doc.blocks] == ["Unit 3: B-Trees", "Unit 4: Hashing"]
        assert [b.page for b in doc.blocks] == [1, 2]

    def test_two_columns_stay_in_reading_order(self, lecture_pdf):
        text = squash(parse_document(lecture_pdf, "PDF").blocks[0].text)
        # The old extractor interleaved the columns line by line.
        assert squash(LEFT) in text
        assert squash(RIGHT) in text
        assert text.index("LEFT COLUMN") < text.index("RIGHT COLUMN")

    def test_repeated_footer_is_removed(self, lecture_pdf):
        doc = parse_document(lecture_pdf, "PDF")
        assert "Lecture Notes" not in doc.full_text

    def test_page_without_text_is_reported(self, lecture_pdf):
        doc = parse_document(lecture_pdf, "PDF")
        assert doc.page_count == 3
        assert doc.empty_pages == [3]

    def test_rejects_a_file_that_is_not_a_pdf(self):
        with pytest.raises(UnsupportedDocument):
            parse_document(b"PK\x03\x04 not a pdf", "PDF")


def parse_markdown(monkeypatch, pages: list[str]):
    """parse_pdf on the given pymupdf4llm output, one Markdown string per page of a blank PDF."""
    monkeypatch.setattr(pdf_module.pymupdf4llm, "to_markdown", lambda *a, **k: [{"text": t} for t in pages])
    doc = pymupdf.open()
    for _ in pages:
        doc.new_page()
    return parse_document(doc.tobytes(), "PDF")


class TestPdfHeadings:
    # pymupdf4llm's output for pages 42-43 of the "Lean Dev" slides exported as PDF: the bullets are in a
    # larger font than the body text, so they come out as a level-2 heading (eval question kanban-principles).
    LEAN_DEV = [
        "# Kanban – Lean Methodology \n\nKanban is a method for managing the creation of products with an "
        "emphasis on continual delivery while not overburdening the development team \n\n\n\n",
        "# Kanban Principles \n\n## • Visualize what you do today (workflow) • Limit the amount of work in "
        "progress (WIP) • Enhance flow \n\n\n\n",
    ]

    def test_bullet_line_in_heading_font_stays_with_its_heading(self, monkeypatch):
        doc = parse_markdown(monkeypatch, self.LEAN_DEV)
        page = [b for b in doc.blocks if b.page == 2]
        assert len(page) == 1
        assert page[0].section == "Kanban Principles"
        assert page[0].text.startswith("Kanban Principles\n")
        assert "Limit the amount of work in progress (WIP)" in page[0].text
        assert "#" not in page[0].text

    @pytest.mark.parametrize("bullet", ["•", "▪", "", "- ", "* ", "– "])
    def test_line_starting_with_a_bullet_is_never_a_section(self, monkeypatch, bullet):
        doc = parse_markdown(monkeypatch, [f"# Agile Methods\n\nIntroduction to agile.\n\n## {bullet}Scrum uses sprints\n"])
        assert [b.section for b in doc.blocks] == ["Agile Methods"]
        assert doc.blocks[0].text.endswith(f"{bullet}Scrum uses sprints")

    def test_heading_with_nothing_under_it_joins_the_next_heading(self, monkeypatch):
        doc = parse_markdown(monkeypatch, ["# Unit 5: Scrum\n\n## Roles\n\nThe product owner orders the backlog.\n"])
        assert len(doc.blocks) == 1
        assert doc.blocks[0].section == "Roles"
        assert doc.blocks[0].text == "Unit 5: Scrum\n\nRoles\n\nThe product owner orders the backlog."

    def test_headings_with_body_text_still_start_new_blocks(self, monkeypatch):
        doc = parse_markdown(monkeypatch, ["# Scrum\n\nA framework.\n\n## Roles\n\nProduct owner, team.\n"])
        assert [(b.section, b.text) for b in doc.blocks] == [
            ("Scrum", "Scrum\n\nA framework."), ("Roles", "Roles\n\nProduct owner, team."),
        ]


class TestPptx:
    def test_one_block_per_slide_with_title_as_section(self, lecture_pptx):
        doc = parse_document(lecture_pptx, "PPT")
        slides = [b for b in doc.blocks if b.kind == "slide"]
        assert [(b.page, b.section) for b in slides] == [
            (1, "Kerberos"), (2, "Kerberos"), (3, "LSTM vs GRU"), (4, "Ticket Granting Ticket"),
        ]
        assert "Developed at MIT in the mid 1980s" in slides[1].text

    def test_tables_are_kept_row_by_row(self, lecture_pptx):
        table_slide = parse_document(lecture_pptx, "PPT").blocks[2]
        assert "Training speed | Slower | Faster" in table_slide.text

    def test_speaker_notes_are_captured(self, lecture_pptx):
        notes = [b for b in parse_document(lecture_pptx, "PPT").blocks if b.kind == "notes"]
        assert len(notes) == 1 and notes[0].page == 4
        assert "stolen TGT" in notes[0].text

    def test_legacy_ppt_needs_libreoffice(self, lecture_pptx, tmp_path):
        if shutil.which("soffice") or shutil.which("libreoffice"):
            pytest.skip("LibreOffice installed; conversion is covered by test_legacy_ppt_converts")
        with pytest.raises(UnsupportedDocument, match="LibreOffice"):
            parse_document(b"\xd0\xcf\x11\xe0" + b"\x00" * 100, "PPT")


@pytest.mark.skipif(not (shutil.which("soffice") or shutil.which("libreoffice")), reason="needs LibreOffice")
def test_legacy_ppt_converts(lecture_pptx, tmp_path):
    import subprocess

    src = tmp_path / "deck.pptx"
    src.write_bytes(lecture_pptx)
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    subprocess.run([soffice, "--headless", "--convert-to", "ppt", "--outdir", str(tmp_path), str(src)],
                   check=True, capture_output=True, timeout=180)
    doc = parse_document((tmp_path / "deck.ppt").read_bytes(), "PPT")
    assert any("Developed at MIT" in b.text for b in doc.blocks)
