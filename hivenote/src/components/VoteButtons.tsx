"use client";

import { useOptimistic, useTransition } from "react";
import { voteResource } from "@/app/resources/actions/vote";
import { useToast } from "./ToastProvider";

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
  const { showToast } = useToast();
  
  // Optimistic state for instant UI updates
  const [optimisticVote, setOptimisticVote] = useOptimistic(
    { score, userVote },
    (state, newVote: 1 | -1 | 0) => {
      // Calculate new score based on vote change
      let scoreChange = 0;
      
      if (state.userVote === 0 && newVote !== 0) {
        // No vote → new vote
        scoreChange = newVote;
      } else if (state.userVote !== 0 && newVote === 0) {
        // Had vote → removing vote
        scoreChange = -state.userVote;
      } else if (state.userVote !== 0 && newVote !== 0 && state.userVote !== newVote) {
        // Changing vote (e.g., upvote to downvote)
        scoreChange = newVote - state.userVote;
      }

      return {
        score: state.score + scoreChange,
        userVote: newVote,
      };
    }
  );

  function handleVote(value: 1 | -1) {
    if (!isLoggedIn) {
      showToast("Please login to vote", "info");
      return;
    }

    const newVote = optimisticVote.userVote === value ? 0 : value;

    startTransition(() => {
      setOptimisticVote(newVote);
      voteResource(resourceId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote(1)}
        disabled={isPending || !isLoggedIn}
        className={`px-2 py-1 border rounded transition
          ${optimisticVote.userVote === 1 ? "bg-green-200" : "hover:bg-gray-100"}
          ${isPending ? "opacity-50 cursor-wait" : ""}
          ${!isLoggedIn ? "cursor-not-allowed opacity-60" : ""}
        `}
        title={
          isLoggedIn
            ? "Upvote"
            : "Login to vote"
        }
      >
        {isPending ? "..." : "▲"}
      </button>

      <span className="font-semibold w-8 text-center">
        {optimisticVote.score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending || !isLoggedIn}
        className={`px-2 py-1 border rounded transition
          ${optimisticVote.userVote === -1 ? "bg-red-200" : "hover:bg-gray-100"}
          ${isPending ? "opacity-50 cursor-wait" : ""}
          ${!isLoggedIn ? "cursor-not-allowed opacity-60" : ""}
        `}
        title={
          isLoggedIn
            ? "Downvote"
            : "Login to vote"
        }
      >
        {isPending ? "..." : "▼"}
      </button>
    </div>
  );
}
