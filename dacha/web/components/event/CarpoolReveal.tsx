"use client";
import { useState, useEffect } from "react";

interface CarpoolRevealProps {
  hasVotedGoing: boolean;
  children: React.ReactNode;
}

/**
 * Smoothly reveals carpool section after user RSVPs "Иду".
 * Uses grid-template-rows trick for smooth height animation.
 */
export function CarpoolReveal({ hasVotedGoing, children }: CarpoolRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (hasVotedGoing) {
      const t = setTimeout(() => setRevealed(true), 200);
      return () => clearTimeout(t);
    } else {
      setRevealed(false);
    }
  }, [hasVotedGoing]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: revealed ? "1fr" : "0fr",
        transition: "grid-template-rows 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          minHeight: 0,
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.4s ease 0.1s",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
