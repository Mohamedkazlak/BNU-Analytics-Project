import { fetchFromBackend } from "../api";

/**
 * Chat is now a real backend endpoint (`POST /api/chat`, backend/routers/
 * ai_insights.py) protected by `Depends(get_current_user)`. Role comes from
 * the verified JWT on the server — never from this request body — which
 * closes the "role is just a field the client sends" gap that existed when
 * this ran as a client-trusted server function. The domain-classification
 * gate (`classify()` + the role→domain access matrix) now lives in
 * backend/services/chat.py, ported 1:1 from this file's previous
 * implementation, and runs before any repository is touched.
 */

export interface AssistantAnswer {
  text: string;
  blocked: boolean;
}

export function askAssistant(question: string): Promise<AssistantAnswer> {
  return fetchFromBackend<AssistantAnswer>("/api/chat", {
    method: "POST",
    body: { question },
  });
}
