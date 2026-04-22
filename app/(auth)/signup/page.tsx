export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6">
      <h1 className="mb-2 text-xl font-semibold">Create an account</h1>
      <p className="text-sm text-muted-foreground">
        Sign-up is managed by Supabase Auth. Enable email or OAuth providers in your Supabase dashboard.
      </p>
    </div>
  );
}
