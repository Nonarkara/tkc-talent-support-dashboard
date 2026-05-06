import { apiJson, logApiError, parseJsonBody } from "@/lib/api";
import { chatPayloadSchema } from "@/lib/api-schemas";

import { SYSTEM_PROMPT, TKC_KNOWLEDGE_BASE } from "@/lib/knowledge-base";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : null;

function buildOfflineReply(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("best team") || lower.includes("team")) {
    return "Use the Formation screen. Lock a director-level coach first, then add one manager bridge before stacking specialists. Watch budget, missing skills, and chemistry together.";
  }

  if (lower.includes("flight") || lower.includes("risk")) {
    return "Check the HRT lens. People with weak community or career scores, low HP, and high utilization are the first retention risks.";
  }

  if (lower.includes("company") || lower.includes("summary")) {
    return "TKC is fighting margin compression. The useful dashboard move is to connect project margin, team chemistry, and retention risk instead of treating HR and delivery as separate worlds.";
  }

  return "The live AI service is offline right now. You can still use the dashboard mechanics: import roster data, assign a coach, build the field, and inspect alerts, chemistry, budget, and Moneyball rankings locally.";
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, chatPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const messages = parsed.data.messages;
  const latestMessage = messages.at(-1)?.content ?? "";

  try {

    if (!GEMINI_URL) {
      return apiJson({ message: buildOfflineReply(latestMessage), offline: true });
    }

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nKnowledge Base:\n${TKC_KNOWLEDGE_BASE}\n\nNow respond to the conversation below.`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: "I understand. I'm TKC's AI assistant, ready to help with team building, talent management, and company insights. How can I help?",
          },
        ],
      },
      ...messages.map((message) => ({
        role: message.role === "user" ? "user" : "model",
        parts: [{ text: message.content }],
      })),
    ];

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal:
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(15_000)
          : undefined,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logApiError("api/chat Gemini API error", error);
      return apiJson(
        { message: buildOfflineReply(latestMessage), offline: true },
        { status: 200 },
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? buildOfflineReply(latestMessage);

    return apiJson({ message: text });
  } catch (error) {
    logApiError("api/chat POST error", error);
    return apiJson(
      { message: buildOfflineReply(latestMessage), offline: true },
      { status: 200 },
    );
  }
}
