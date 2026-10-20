import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { QuiterioAgentMascot as BoltMascot } from "./QuiterioAgentMascot";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Endpoint do agente.
 * - Em projetos Lovable Cloud, usa o functions do backend automaticamente.
 * - Em outros projetos, defina VITE_AGENT_ENDPOINT no .env apontando para a
 *   sua rota de chat (que faz stream de respostas no formato OpenAI SSE).
 */
const AGENT_URL = "/api/public/quiterio-chat";

const GREETING =
  "Oi! Eu sou o **Quitério** 🐱, seu guia de leitura da biblioteca. Me conta: que tipo de história você curte?";

const SUGGESTIONS = [
  "Me indica um livro de aventura",
  "Quero algo curto pra ler hoje",
  "Sugere um clássico",
  "O que tem de romance disponível?",
];

/** Faixa decorativa com as 4 cores da marca (sem depender de CSS global). */
function PuzzleStripe() {
  return (
    <div
      aria-hidden="true"
      className="h-1.5 w-full"
      style={{
        background:
          "linear-gradient(90deg, #F08A3C 0% 25%, #17A67D 25% 50%, #E24B4B 50% 75%, #2B8FD1 75% 100%)",
      }}
    />
  );
}

export function QuiterioChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /** Fecha a janela e limpa a conversa para a próxima consulta. */
  const closeAndReset = () => {
    setOpen(false);
    setInput("");
    setLoading(false);
    setMessages([{ role: "assistant", content: GREETING }]);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let acc = "";
    const upsertAssistant = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && (last as Msg & { streaming?: boolean })) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (resp.status === 429) {
        toast.error("Muitas mensagens. Aguarde um instante.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Créditos de IA esgotados.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Falha no chat");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      // mensagem placeholder do assistente
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsertAssistant(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao falar com o Quitério");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-[60] h-24 w-24 overflow-hidden rounded-full grid place-items-center bg-white shadow-2xl hover:scale-110 transition-transform border-2 border-green-400"
          aria-label="Abrir Quitério — assistente de leitura"
        >
          <BoltMascot size={96} mood="happy" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Janela do chat */}
      {open && (
        <div className="fixed inset-x-3 bottom-3 sm:inset-auto sm:bottom-5 sm:left-5 sm:w-[380px] z-[60] bg-[#13072b] border border-[#3e196e] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[600px] overflow-hidden">
          <PuzzleStripe />
          <header className="px-4 py-3 flex items-center gap-2 border-b border-[#3e196e] bg-[#1f0b3b]">
            <div className="h-10 w-10 grid place-items-center">
              <BoltMascot size={40} mood={loading ? "talking" : "happy"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm leading-tight text-slate-100">Quitério</p>
              <p className="text-[11px] text-amber-300 leading-tight">
                Seu guia de leitura 🐱
              </p>
            </div>
            <button
              onClick={closeAndReset}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#3e196e] bg-[#1f0b3b] text-slate-100 shadow-sm transition-colors hover:bg-red-500 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-green-600 text-white rounded-br-sm"
                    : "bg-[#1f0b3b] text-slate-100 rounded-bl-sm border border-[#3e196e]"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-slate-100 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 prose-headings:font-display">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="bg-[#1f0b3b] border border-[#3e196e] text-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm w-fit">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-[#1f0b3b] text-slate-200 hover:bg-[#3e196e] hover:text-white transition-colors border border-[#3e196e]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-2 border-t border-[#3e196e] flex gap-2 bg-[#1f0b3b]"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao Quitério..."
              disabled={loading}
              className="flex-1 bg-[#0c0420] text-slate-100 border-[#3e196e]"
            />
            <Button type="submit" size="icon" className="bg-green-600 text-white hover:bg-green-700" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
