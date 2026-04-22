import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/responses";
import { importYahooPayload } from "@/lib/yahoo/importer";

const schema = z.instanceof(File);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const formData = await request.formData();
  const parsed = schema.safeParse(formData.get("file"));
  if (!parsed.success) return fail("Missing file", 400);

  const text = await parsed.data.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    return fail("Invalid JSON in uploaded file", 400);
  }
  const result = await importYahooPayload(payload);

  return ok(result, 201);
}
