import Link from "next/link";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-card md:hidden">
      <div className="grid grid-cols-4 text-center text-xs">
        <Link className="p-3" href="/dashboard">Home</Link>
        <Link className="p-3" href="/teams">Teams</Link>
        <Link className="p-3" href="/players">Players</Link>
        <Link className="p-3" href="/import">Import</Link>
      </div>
    </nav>
  );
}
