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
    chunks = build_chunks(doc, "Doc")
    assert [(c.content, c.page) for c in chunks] == [("alpha text", 1), ("beta text", 1), ("more beta", 2)]


def test_pages_under_one_heading_can_be_packed():
    doc = ParsedDocument(
        blocks=[Block("alpha text", 1, "A"), Block("beta text", 1, "B"), Block("more beta", 2, "B")],
        page_count=2,
    )
    chunks = build_chunks(doc, "Doc", pdf_pack_pages=True)
    assert [(c.content, c.page) for c in chunks] == [("alpha text", 1), ("beta text\n\nmore beta", 1)]


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
