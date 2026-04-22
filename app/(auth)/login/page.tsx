"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const nextParam = new URLSearchParams(window.location.search).get("next");
    if (nextParam?.startsWith("/")) setNextPath(nextParam);
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const redirectPath = (nextPath.startsWith("/") ? nextPath : "/dashboard") as Route;
    router.push(redirectPath);
    router.refresh();
  };

  const onGoogle = async () => {
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${nextPath}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // On success the browser is redirected by Supabase; no need to reset loading.
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to view your RCUP dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
              Sign in with Google
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link className="underline" href={"/signup" as Route}>
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
