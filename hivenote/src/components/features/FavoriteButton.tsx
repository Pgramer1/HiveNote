"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/actions/favorites";
import { useToast } from "@/components/ui/ToastProvider";
import { Heart } from "lucide-react";

type Props = {
  resourceId: string;
  isFavorited: boolean;
  isLoggedIn: boolean;
};

export default function FavoriteButton({
  resourceId,
  isFavorited: initialFavorited,
  isLoggedIn,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Optimistic state for instant UI updates
  const [optimisticFavorited, setOptimisticFavorited] = useOptimistic(
    initialFavorited,
    (_, newValue: boolean) => newValue
  );

  function handleToggleFavorite() {
    if (!isLoggedIn) {
      showToast("Please login to add favorites", "info");
      return;
    }

    const newValue = !optimisticFavorited;

    startTransition(async () => {
      // Set optimistic state inside transition
      setOptimisticFavorited(newValue);
      
      try {
        await toggleFavorite(resourceId);
        showToast(
          newValue ? "Added to favorites" : "Removed from favorites",
          "success"
        );
      } catch (error) {
        showToast("Failed to update favorite", "error");
        // Revert optimistic update on error
        setOptimisticFavorited(!newValue);
      }
    });
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isPending}
      className={`p-2 rounded-lg transition-all ${
        optimisticFavorited
          ? "text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
          : "text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      } ${isPending ? "opacity-50 cursor-wait" : ""} ${
        !isLoggedIn ? "cursor-not-allowed" : ""
      }`}
      title={isLoggedIn ? (optimisticFavorited ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
      aria-label={optimisticFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`w-5 h-5 transition-all ${
          optimisticFavorited ? "fill-current" : ""
        }`}
      />
    </button>
  );
}
