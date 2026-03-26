"use client";

import { useEffect, useState } from "react";
import { voteResource } from "@/actions/vote";
import { useToast } from "@/components/ui/ToastProvider";
import { calculateVoteChange } from "@/utils/resources";
import type { VoteValue } from "@/types";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Props = {
  resourceId: string;
  score: number;
  userVote: number;
  isLoggedIn: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
};

export default function VoteButtons({
  resourceId,
  score,
  userVote,
  isLoggedIn,
  className,
  orientation = "horizontal"
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  const [localScore, setLocalScore] = useState(score);
  const [localUserVote, setLocalUserVote] = useState(userVote);

  // Keep local state aligned when parent data refreshes.
  useEffect(() => {
    setLocalScore(score);
    setLocalUserVote(userVote);
  }, [score, userVote]);

  async function handleVote(value: 1 | -1) {
    if (!isLoggedIn) {
      showToast("Please login to vote", "info");
      return;
    }

    if (isPending) return;

    const previousVote = localUserVote;
    const previousScore = localScore;
    const newVote: VoteValue = localUserVote === value ? 0 : value;
    const scoreChange = calculateVoteChange(localUserVote, newVote);

    // Optimistic UI update happens immediately.
    setLocalUserVote(newVote);
    setLocalScore((current) => current + scoreChange);
    setIsPending(true);

    try {
      await voteResource(resourceId, value);
    } catch (error) {
      // Roll back optimistic state if server action fails.
      setLocalUserVote(previousVote);
      setLocalScore(previousScore);
      showToast(error instanceof Error ? error.message : "Failed to update vote", "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={cn(
      "flex items-center bg-muted/30 border rounded-lg overflow-hidden",
      orientation === "vertical" ? "flex-col w-12 py-1" : "flex-row h-9",
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleVote(1)}
        disabled={isPending || !isLoggedIn}
        className={cn(
          "h-8 w-8 rounded-none hover:bg-muted/80",
          orientation === "vertical" && "h-8 w-full",
          localUserVote === 1 && "text-green-600 bg-green-500/10 hover:bg-green-500/20"
        )}
        title={isLoggedIn ? "Upvote" : "Login to vote"}
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-4 h-4" />}
      </Button>

      <span className={cn(
        "font-semibold text-sm grid place-content-center min-w-[2.5ch] text-muted-foreground",
         orientation === "vertical" ? "py-1" : "px-1"
      )}>
        {localScore}
      </span>

      <Button
         variant="ghost"
         size="icon"
        onClick={() => handleVote(-1)}
        disabled={isPending || !isLoggedIn}
        className={cn(
           "h-8 w-8 rounded-none hover:bg-muted/80",
           orientation === "vertical" && "h-8 w-full",
          localUserVote === -1 && "text-red-600 bg-red-500/10 hover:bg-red-500/20"
        )}
        title={isLoggedIn ? "Downvote" : "Login to vote"}
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
    </div>
  );
}
