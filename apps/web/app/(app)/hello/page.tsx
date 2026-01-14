import { getTimeBasedGreeting } from "@project/core";

// Static placeholder waveform heights
const WAVEFORM_HEIGHTS = [10, 14, 12, 18, 16, 14, 20, 12, 16, 18, 14, 10, 16, 12, 18, 14, 16, 12, 10, 14];

export default function HelloPage() {
  const greeting = getTimeBasedGreeting();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Greeting */}
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            {greeting}
          </h1>
          <p className="text-lg text-muted-foreground">
            Describe your consultation, and I&apos;ll start transcribing it for you.
          </p>
        </div>

        {/* Placeholder for recording bar */}
        <div className="mt-12">
          <div className="mx-auto max-w-sm rounded-full border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              {/* Waveform placeholder */}
              <div className="flex flex-1 items-center gap-0.5">
                {WAVEFORM_HEIGHTS.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-muted-foreground/30 rounded-full"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
              {/* Record button */}
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                aria-label="Start recording"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-12 text-xs text-muted-foreground">
          Mabel can make mistakes. Always review content and use your own judgement.
        </p>
      </div>
    </div>
  );
}
