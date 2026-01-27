"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";

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
    <form onSubmit={handleSearch} className="max-w-xl mx-auto w-full">
      <div className="relative flex items-center w-full group">
        <Search className="absolute left-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for notes, PDFs, or resources..."
          className="pl-12 pr-28 h-14 text-lg rounded-full shadow-lg border-muted/40 bg-background/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all hover:bg-background/80 hover:shadow-xl hover:border-muted/60"
        />
        <Button 
          type="submit" 
          className="absolute right-2 top-2 bottom-2 rounded-full px-6 h-auto"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
