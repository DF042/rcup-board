export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/20 p-4 md:p-8">{children}</div>;
}
