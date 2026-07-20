import React from "react";

const symbols = [
  ["folder", "M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  ["image", "M3 4h18v16H3z"],
  ["play", "M7 5l12 7-12 7z"],
  ["pause", "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"],
  ["cancel", "M5 5l14 14M19 5L5 19"],
  ["check", "M5 12l4 4 10-10"],
  ["warn", "M12 3l9 16H3z"],
  ["open", "M5 11h14M14 8l4 4-4 4"],
] as const;

export const IconSprite: React.FC = () => (
  <svg width="0" height="0" className='absolute' aria-hidden="true">
    {symbols.map(([id, d]) => (
      <symbol key={id} id={`i-${id}`} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </symbol>
    ))}
  </svg>
);

export const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => (
  <svg width={size} height={size} aria-hidden="true">
    <use href={`#i-${name}`} />
  </svg>
);
