import { z } from "zod";
import { crossViewQuery } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  viewType: z.enum(["team", "manager"]),
  entityId: z.string().min(1),
  season: z.number().optional(),
  week: z.number().optional(),
  dataType: z.enum(["record", "roster", "matchups", "stats", "transactions"]),
  position: z.string().optional(),
  compareEntityId: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await crossViewQuery(parsed.data);
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
