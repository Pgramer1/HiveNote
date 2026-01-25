"use client";

import { useTransition } from "react";
import { voteResource } from "@/app/resources/actions/vote";

type Props = {
  resourceId: string;
  score: number;
  userVote: number;
  isLoggedIn: boolean;
};

export default function VoteButtons({
  resourceId,
  score,
  userVote,
  isLoggedIn,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleVote(value: 1 | -1) {
    if (!isLoggedIn) return;

    startTransition(() => {
      voteResource(resourceId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote(1)}
        disabled={isPending || !isLoggedIn}
        className={`px-2 py-1 border rounded
          ${userVote === 1 ? "bg-green-200" : "hover:bg-gray-100"}
        `}
        title={
          isLoggedIn
            ? "Upvote"
            : "Login to vote"
        }
      >
        ▲
      </button>

      <span className="font-semibold w-6 text-center">
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending || !isLoggedIn}
        className={`px-2 py-1 border rounded
          ${userVote === -1 ? "bg-red-200" : "hover:bg-gray-100"}
        `}
        title={
          isLoggedIn
            ? "Downvote"
            : "Login to vote"
        }
      >
        ▼
      </button>
    </div>
  );
}
