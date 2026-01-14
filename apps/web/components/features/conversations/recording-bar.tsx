"use client";

import * as React from "react";

// Static placeholder waveform heights
const WAVEFORM_HEIGHTS = [8, 12, 10, 16, 14, 12, 18, 10, 14, 16, 12, 8, 14, 10, 16, 12, 14, 10, 8, 12];

export function RecordingBar() {
  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-sm rounded-full border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-0.5">
            {WAVEFORM_HEIGHTS.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-muted-foreground/30 rounded-full"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
            aria-label="Start recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
