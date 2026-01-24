import Link from "next/link";

export default function Home() {
  return (
    <section className="p-6">
      <h1 className="text-4xl font-bold mb-4">
        Centralized learning resources for students
      </h1>

      <p className="text-gray-600 mb-6">
        Find notes, PDFs, and curated links uploaded by students.
      </p>

      <Link
        href="/resources"
        className="inline-block bg-black text-white px-4 py-2 rounded"
      >
        Browse Resources
      </Link>
    </section>
  );
}
