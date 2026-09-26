"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1>DevDigest failed to load</h1>
        <p style={{ color: "#666" }}>{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
