export function Header({ title }: { title: string }) {
  return (
    <header className="border-b bg-card px-4 py-3 md:px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
