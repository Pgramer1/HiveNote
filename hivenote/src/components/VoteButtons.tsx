"use client";

import { useTransition } from "react";
import { voteResource } from "@/app/resources/actions/vote";

type Props = {
  resourceId: string;
  score: number;
};

export default function VoteButtons({ resourceId, score }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleVote(value: 1 | -1) {
    startTransition(() => {
      voteResource(resourceId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote(1)}
        disabled={isPending}
        className="px-2 py-1 border rounded hover:bg-gray-100"
        title="Upvote"
      >
        ▲
      </button>

      <span className="font-semibold w-6 text-center">
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending}
        className="px-2 py-1 border rounded hover:bg-gray-100"
        title="Downvote"
      >
        ▼
      </button>
    </div>
  );
}
