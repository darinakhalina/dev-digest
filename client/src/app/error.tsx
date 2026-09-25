"use client";

import { ErrorState } from "@devdigest/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ErrorState
        fullScreen
        title="Something went wrong"
        body={error.message || "An unexpected error occurred."}
        onRetry={reset}
      />
    </div>
  );
}
