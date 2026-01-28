"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function NavbarSearch() {
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
    <form onSubmit={handleSearch} className="relative flex items-center flex-1 max-w-md">
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources..."
        className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
      />
    </form>
  );
}
