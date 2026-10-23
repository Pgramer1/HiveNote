from app.chunking import build_chunks
from app.parsing import parse_document
from app.parsing.model import Block, ParsedDocument


def test_pdf_chunks_follow_sections_and_carry_a_context_header(lecture_pdf):
    chunks = build_chunks(parse_document(lecture_pdf, "PDF"), "CS201 Notes")
    assert [(c.section, c.page) for c in chunks] == [("Unit 3: B-Trees", 1), ("Unit 4: Hashing", 2)]
    assert chunks[0].embed_text.startswith("CS201 Notes › Unit 3: B-Trees › p. 1\n\n")
    assert not chunks[0].content.startswith("CS201 Notes")  # header is for embedding only
    assert [c.index for c in chunks] == [0, 1]


def test_long_sections_are_split_within_the_size_limit():
    sentences = " ".join(f"Sentence number {i} explains one more detail." for i in range(200))
    doc = ParsedDocument(blocks=[Block(sentences, page=7, section="Long")], page_count=7)
    chunks = build_chunks(doc, "Doc", chunk_size=500, chunk_overlap=50)
    assert len(chunks) > 5
    assert all(len(c.content) <= 500 for c in chunks)
    assert all(c.page == 7 and c.section == "Long" for c in chunks)


def test_pdf_chunks_stay_within_a_page_and_a_section_by_default():
    doc = ParsedDocument(
        blocks=[Block("alpha text", 1, "A"), Block("beta text", 1, "B"), Block("more beta", 2, "B")],
        page_count=2,
    )
    chunks = build_chunks(doc, "Doc", min_chunk_chars=0)  # placeholder texts are below the tiny-chunk size
    assert [(c.content, c.page) for c in chunks] == [("alpha text", 1), ("beta text", 1), ("more beta", 2)]


def test_pages_under_one_heading_can_be_packed():
    doc = ParsedDocument(
        blocks=[Block("alpha text", 1, "A"), Block("beta text", 1, "B"), Block("more beta", 2, "B")],
        page_count=2,
    )
    chunks = build_chunks(doc, "Doc", pdf_pack_pages=True, min_chunk_chars=0)
    assert [(c.content, c.page) for c in chunks] == [("alpha text", 1), ("beta text\n\nmore beta", 1)]


def test_bare_heading_is_merged_into_the_next_chunk_on_its_page():
    # Page 43 of "Lean Dev" as rag-2 parsed it: the heading alone, then the bullets under their own "section".
    bullets = "• Visualize what you do today (workflow) • Limit the amount of work in progress (WIP) • Enhance flow"
    doc = ParsedDocument(
        blocks=[
            Block("Kanban – Lean Methodology\n\nKanban is a method for managing the creation of products", 42,
                  "Kanban – Lean Methodology"),
            Block("Kanban Principles", 43, "Kanban Principles"),
            Block(bullets, 43, bullets),
        ],
        page_count=43,
    )
    chunks = build_chunks(doc, "Lean Dev")
    assert [(c.page, c.section) for c in chunks] == [(42, "Kanban – Lean Methodology"), (43, "Kanban Principles")]
    assert chunks[1].content == f"Kanban Principles\n\n{bullets}"
    assert chunks[1].embed_text.startswith("Lean Dev › Kanban Principles › p. 43\n\n")


def test_tiny_fragment_at_the_end_of_a_page_joins_the_previous_chunk():
    doc = ParsedDocument(
        blocks=[Block("A long enough paragraph about hashing.", 1, "A"), Block("See p. 4", 1, "B")],
        page_count=1,
    )
    assert [c.content for c in build_chunks(doc, "Doc")] == ["A long enough paragraph about hashing.\n\nSee p. 4"]


def test_tiny_chunks_are_not_merged_across_pages():
    doc = ParsedDocument(
        blocks=[Block("Unit 6", 1, "Unit 6"), Block("A long enough paragraph about graphs.", 2, "Unit 6")],
        page_count=2,
    )
    assert [(c.content, c.page) for c in build_chunks(doc, "Doc")] == [
        ("Unit 6", 1), ("A long enough paragraph about graphs.", 2),
    ]


def test_several_tiny_fragments_on_a_page_end_up_in_one_chunk():
    doc = ParsedDocument(blocks=[Block("Q1", 3, "Q1"), Block("Q2", 3, "Q2"), Block("Q3", 3, "Q3")], page_count=3)
    chunks = build_chunks(doc, "Doc")
    assert [(c.content, c.section) for c in chunks] == [("Q1\n\nQ2\n\nQ3", "Q1")]


def test_context_header_can_be_switched_off(lecture_pdf):
    chunks = build_chunks(parse_document(lecture_pdf, "PDF"), "CS201 Notes", context_header=False)
    assert all(c.embed_text == c.content for c in chunks)


def test_short_slides_with_the_same_title_are_merged(lecture_pptx):
    chunks = build_chunks(parse_document(lecture_pptx, "PPT"), "Kerberos lecture")
    first = chunks[0]
    assert first.page == 1 and first.kind == "slide"
    assert "Network authentication protocol" in first.content
    assert "Developed at MIT" in first.content  # slide 2 continued slide 1
    assert [c.page for c in chunks] == [1, 3, 4]


def test_speaker_notes_stay_with_their_slide(lecture_pptx):
    last = build_chunks(parse_document(lecture_pptx, "PPT"), "Deck")[-1]
    assert last.page == 4
    assert "stolen TGT" in last.content
    assert last.embed_text.startswith("Deck › Ticket Granting Ticket › slide 4")
