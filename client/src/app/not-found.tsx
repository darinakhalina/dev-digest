import Link from "next/link";
import { Icon } from "@devdigest/ui";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <Icon.Search size={44} style={{ color: "var(--text-muted)" }} />
      <h1 style={{ margin: 0 }}>Page not found</h1>
      <p style={{ color: "var(--text-secondary)", margin: 0 }}>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" style={{ color: "var(--accent)" }}>
        Go home
      </Link>
    </div>
  );
}
