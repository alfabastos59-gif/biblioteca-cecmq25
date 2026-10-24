import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { QuiterioAgentMascot } from "./QuiterioAgentMascot";
import { DEFAULT_AUTHORS } from "../data/authorsData";
import { localQuiterioAnswer } from "@/lib/quiterio-local";
import type { Book } from "../types";

type Msg = { role: "user" | "assistant"; content: string };
const MODE = "gateway";
const GREETING = "Oi! Eu sou o **Quitério** 🐱, seu guia de leitura. Que história você quer descobrir hoje?";

export function QuiterioChat({ books, visible = true }: { books: Book[]; visible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  useEffect(() => { if (open && !loading) textareaRef.current?.focus(); }, [open, loading]);
  useEffect(() => { if (!visible) close(); }, [visible]);
  const close = () => {
    requestRef.current?.abort(); requestRef.current = null;
    setOpen(false); setLoading(false); setInput(""); setError(""); setSource("");
    setMessages([{ role: "assistant", content: GREETING }]);
  };
  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading || requestRef.current) return;
    setError(""); setSource(""); setInput(""); setLoading(true);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    const controller = new AbortController(); requestRef.current = controller;
    let acc = "";
    const append = (chunk: string) => {
      if (requestRef.current !== controller) return;
      acc += chunk;
      setMessages([...next, { role: "assistant", content: acc }]);
    };
    try {
      let response: Response;
      try {
        response = await fetch("/api/public/quiterio-chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next.slice(-20), mode: MODE }), signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw err;
        append(localQuiterioAnswer(content, books, DEFAULT_AUTHORS)); setSource("Orientação local · conexão indisponível");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || `Quitério indisponível (${response.status}).`);
      }
      if (!response.body) throw new Error("A resposta não chegou. Tente novamente quando a conexão voltar.");
      setSource(response.headers.get("X-Quiterio-Source") || "");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim(); if (!data || data === "[DONE]") continue;
          const event = JSON.parse(data);
          if (event.error) throw new Error(event.error.message || event.error);
          const chunk = event.choices?.[0]?.delta?.content;
          if (chunk) append(chunk);
        }
        if (done) break;
      }
      if (!acc) throw new Error("Quitério não retornou uma resposta. A consulta foi encerrada.");
    } catch (err) {
      if (!controller.signal.aborted && requestRef.current === controller) setError(err instanceof Error ? err.message : "Não foi possível falar com o Quitério.");
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
    }
  };
  if (!visible) return null;
  return <>
    {!open && <Button onClick={() => setOpen(true)} variant="ghost" className="fixed bottom-3 left-3 z-[60] h-28 w-28 p-0 hover:bg-transparent" aria-label="Abrir Quitério — assistente de leitura"><QuiterioAgentMascot size={112} mood="idle" /></Button>}
    {open && <section aria-label="Conversa com Quitério" className="quiterio-window fixed left-1/2 top-1/2 z-[60] flex h-[min(46vh,30rem)] w-[min(46vw,34rem)] min-h-[16rem] min-w-[17rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <div aria-hidden="true" className="quiterio-stripe h-1.5 w-full shrink-0" />
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-secondary px-3 py-2">
        <QuiterioAgentMascot size={40} mood={loading ? "talking" : "happy"} />
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold">Quitério</h2><p className="truncate text-xs text-muted-foreground">Seu guia de leitura 🐱</p></div>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar Quitério" title="Fechar"><X /></Button>
      </header>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-3 sm:p-4">
          {messages.map((m, i) => <Message key={i} from={m.role}>
            <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
              {m.role === "assistant" ? m.content ? <MessageResponse>{m.content}</MessageResponse> : loading ? <Shimmer>Quitério está consultando...</Shimmer> : null : <p className="whitespace-pre-wrap break-words">{m.content}</p>}
            </MessageContent>
          </Message>)}
        </ConversationContent><ConversationScrollButton />
      </Conversation>
      {source && <p className="shrink-0 px-4 pb-1 text-xs text-muted-foreground">{source}</p>}
      {error && <p role="alert" className="shrink-0 px-4 py-2 text-sm text-destructive">{error}</p>}
      <div className="shrink-0 border-t border-border bg-secondary p-3">
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputTextarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} maxLength={2000} placeholder="Pergunte ao Quitério..." aria-label="Pergunte ao Quitério" disabled={loading} className="min-h-[48px] max-h-[120px] text-foreground" />
          <PromptInputFooter className="justify-end"><PromptInputSubmit aria-label={loading ? "Parar resposta" : "Enviar pergunta"} status={loading ? "streaming" : "ready"} onStop={() => requestRef.current?.abort()} disabled={!loading && !input.trim()} /></PromptInputFooter>
        </PromptInput>
      </div>
    </section>}
  </>;
}
