"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/resources?query=${encodeURIComponent(query)}`);
    } else {
      router.push("/resources");
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search for notes, PDFs, or resources..."
          className="flex-1 border-2 border-gray-300 dark:border-gray-600 p-4 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition text-lg bg-white dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium shadow-md hover:shadow-lg"
        >
          Search
        </button>
      </div>
    </form>
  );
}
