"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";

interface ResizableLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  className?: string;
}

export default function ResizableLayout({
  left,
  right,
  defaultLeftPercent = 65,
  minLeftPercent = 30,
  maxLeftPercent = 80,
  className = "",
}: ResizableLayoutProps) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(maxLeftPercent, Math.max(minLeftPercent, rawPercent));
    setLeftPercent(clamped);
  }, [minLeftPercent, maxLeftPercent]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div ref={containerRef} className={`flex gap-0 w-full ${className}`}>
      {/* Left panel */}
      <div
        className="overflow-auto bg-card rounded-xl border shadow-sm"
        style={{ width: `${leftPercent}%`, minWidth: 0 }}
      >
        <div className="p-4 h-full">{left}</div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex-shrink-0 w-2 mx-1 flex items-center justify-center cursor-col-resize group"
        title="Drag to resize"
      >
        <div className="h-16 w-1 rounded-full bg-border group-hover:bg-primary transition-colors flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-muted-foreground group-hover:text-primary absolute" />
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-1 overflow-hidden h-full"
        style={{ minWidth: 0 }}
      >
        {right}
      </div>
    </div>
  );
}
