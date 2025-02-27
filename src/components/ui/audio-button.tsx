"use client";

import * as React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export function AudioButton({
  src,
  className,
  ...props
}: ComponentProps<"button"> & { src: string }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      // Create audio element on first play
      audioRef.current = new Audio(src);
      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  React.useEffect(() => {
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", () =>
          setIsPlaying(false)
        );
      }
    };
  }, []);

  return (
    <button
      onClick={togglePlay}
      className={cn(
        "size-8 flex items-center justify-center rounded-md border bg-background hover:bg-accent transition-colors",
        className
      )}
      {...props}
    >
      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
    </button>
  );
}
