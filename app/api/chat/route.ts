import OpenAI from "openai";
import { StreamingTextResponse } from "ai";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chatToolDefinitions, runChatTool } from "@/mcp/tools";

const schema = z.object({
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
});

const systemPrompt = `You are a fantasy sports assistant for the rcup-board league dashboard.
You ONLY answer questions about this specific fantasy league's data.
You MUST use the provided tools to look up real data before answering any question about stats, records, or standings.
NEVER make up or estimate any statistics — if data is not available via tools, say so explicitly.
Keep responses concise and formatted for easy reading.
Do not answer questions unrelated to fantasy sports or this league.`;

export async function POST(req: Request) {
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = schema.safeParse(rawBody);
  if (!body.success) {
    return new Response(JSON.stringify({ error: body.error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...body.data.history.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: body.data.message },
  ];

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"; // default lightweight model when OPENAI_MODEL is not configured

  const initial = await openai.chat.completions.create({
    model,
    messages,
    tools: chatToolDefinitions,
    tool_choice: "auto",
    temperature: 0.1,
  });

  const assistantMessage = initial.choices[0]?.message;
  if (!assistantMessage) {
    return new Response(JSON.stringify({ error: "No response from model" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toolCalls = assistantMessage.tool_calls ?? [];
  if (toolCalls.length) {
    messages.push({ role: "assistant", content: assistantMessage.content ?? "", tool_calls: toolCalls });

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }

      const result = await runChatTool(toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  const response = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature: 0.1,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) controller.enqueue(encoder.encode(content));
      }
      controller.close();
    },
  });

  return new StreamingTextResponse(stream);
}
