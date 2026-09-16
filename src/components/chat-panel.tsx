import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { askAssistant } from "@/lib/assistant.functions";
import { subscribeToChatOpen } from "@/lib/chat-bus";
import { useRole } from "./role-context";

const headers: Record<Role, string> = {
  student: "Ask about your data",
  professor: "Ask about your curriculum",
  it_academic_integrity: "Ask about live exams & flagged cases",
  senior_management: "Ask about the university",
  program_director: "Ask about your college",
  academic_affairs: "Ask about student performance",
};

const openers: Record<Role, string> = {
  student:
    "Hi Omar — ask me about your scores, topics or how you compare with the anonymized class average.",
  professor:
    "Ask me about your assigned curricula — scores, item quality, attendance or participation.",
  it_academic_integrity:
    "Ask me about any live exam at the university, flagged cases, timing anomalies or IP overlap.",
  senior_management:
    "Ask me about pass rates, colleges, participation or integrity trends in the scope you can see.",
  program_director:
    "Ask me about every curriculum in your college — pass rates, item quality or student performance.",
  academic_affairs:
    "Ask me about student performance, attendance and at-risk students across every curriculum in the college.",
};

const suggestions: Record<Role, string[]> = {
  student: ["How am I doing vs the class?", "Which topic is dragging me down?"],
  professor: ["Which questions need review?", "How is section B performing?"],
  it_academic_integrity: [
    "Which live exam has flags?",
    "What drives the highest risk case?",
  ],
  senior_management: [
    "Which college is weakest?",
    "How are pass rates trending?",
  ],
  program_director: [
    "Which curriculum is weakest?",
    "Any flagged items this term?",
  ],
  academic_affairs: [
    "Which curriculum has weak attendance?",
    "Which students are at risk?",
  ],
};

interface Msg {
  id: number;
  from: "user" | "ai";
  text: string;
  blocked?: boolean;
}

export function ChatPanel() {
  const { role, user } = useRole();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: 0, from: "ai", text: openers[role] }]);
  }, [role, user.id]);

  useEffect(
    () =>
      subscribeToChatOpen((req) => {
        setContext(req.context);
        setOpen(true);
        if (req.question) setInput(req.question);
      }),
    [],
  );

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, pending, open]);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), from: "user", text }]);
    setPending(true);
    try {
      const answer = await askAssistant(text);
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "ai",
          text: answer.text,
          blocked: answer.blocked,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "ai",
          text: "Something went wrong answering that — try again in a moment.",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ai px-4 py-3 text-[13px] font-semibold text-white shadow-xl shadow-ai/30"
      >
        <MessageCircle className="size-4" />
        Ask AI
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(560px,80vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <div className="text-[13px] font-semibold text-ink">
                {headers[role]}
              </div>
              {context && (
                <div className="text-[11px] text-ink-soft">{context}</div>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-ink-soft hover:bg-black/5"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={threadRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.from === "user"
                    ? "ml-auto bg-iris text-white"
                    : m.blocked
                      ? "bg-rose/10 text-rosee"
                      : "bg-iris/8 text-ink",
                )}
              >
                {m.text}
              </div>
            ))}
            {pending && (
              <div className="text-[12px] text-ink-soft">Thinking…</div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-3 py-2">
            {suggestions[role].map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-ai/30 bg-ai/5 px-2.5 py-1 text-[11px] font-medium text-ai"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-black/5 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-full border border-black/10 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-ai/50"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="grid size-9 place-items-center rounded-full bg-ai text-white disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
