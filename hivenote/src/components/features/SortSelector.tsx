"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type SortSelectorProps = {
  currentSort: string;
};

export default function SortSelector({ currentSort }: SortSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Sort by:</label>
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="new">Newest</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>
    </div>
  );
}
