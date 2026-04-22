"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-6">
      <div className="mx-auto max-w-xl rounded border p-4 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">We could not load this view right now.</p>
        <button type="button" onClick={reset} className="mt-3 rounded border px-3 py-2 text-sm">
          Retry
        </button>
      </div>
    </div>
  );
}
