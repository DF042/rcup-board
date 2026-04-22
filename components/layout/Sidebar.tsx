import Link from "next/link";
import type { Route } from "next";

const links: Array<{ label: string; href: Route }> = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Teams", href: "/teams" },
  { label: "Managers", href: "/managers" },
  { label: "Players", href: "/players" },
  { label: "Matchups", href: "/matchups" },
  { label: "Seasons", href: "/seasons" },
  { label: "Import", href: "/import" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card p-4 md:block">
      <h2 className="mb-6 text-lg font-semibold">RCUP Board</h2>
      <nav className="space-y-1">
        {links.map(({ label, href }) => (
          <Link key={href} href={href} className="block rounded px-3 py-2 text-sm hover:bg-muted">
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
