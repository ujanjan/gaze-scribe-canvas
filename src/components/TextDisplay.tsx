import React, { useEffect, useState, useRef } from "react";
import wordTrackingService, { WordBounds } from "@/services/wordTrackingService";

interface TextDisplayProps {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
  highlightedWordIndex?: number;
  onWordsExtracted?: (words: WordBounds[]) => void;
}

const TextDisplay = ({
  children,
  containerRef,
  highlightedWordIndex,
  onWordsExtracted,
}: TextDisplayProps) => {
  const [wordBounds, setWordBounds] = useState<WordBounds[]>([]);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Extract word bounds when component mounts
    const bounds = wordTrackingService.extractWordBounds(containerRef.current);
    setWordBounds(bounds);

    if (onWordsExtracted) {
      onWordsExtracted(bounds);
    }

    // Update container offset
    const rect = containerRef.current.getBoundingClientRect();
    setContainerOffset({ x: rect.left, y: rect.top });
  }, [containerRef, onWordsExtracted]);

  // Recalculate offset on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerOffset({ x: rect.left, y: rect.top });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [containerRef]);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Highlighted word box overlay */}
      {highlightedWordIndex !== undefined && highlightedWordIndex >= 0 && (
        <svg
          className="fixed inset-0 pointer-events-none z-50"
          style={{ width: "100vw", height: "100vh" }}
        >
          {wordBounds.map((word) => {
            if (word.index !== highlightedWordIndex) return null;

            return (
              <rect
                key={`highlight-${word.index}`}
                x={word.x}
                y={word.y}
                width={word.width}
                height={word.height}
                fill="rgb(253, 224, 71)"
                opacity="0.4"
                rx="2"
              />
            );
          })}
        </svg>
      )}

      {/* Text content */}
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </div>
  );
};

export default TextDisplay;
