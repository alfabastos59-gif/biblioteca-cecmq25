import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, BookOpen, Trophy, History, Home, PawPrint } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { QuiterioAgentMascot } from "./QuiterioAgentMascot";
import { localQuiterioAnswer } from "@/lib/quiterio-local";
import type { ActiveTab, Book } from "../types";

type Msg = { role: "user" | "assistant"; content: string };
const GREETING = "Oi! Eu sou o **Quitério** 🐱, seu guia de leitura. Que história você quer descobrir hoje?";
const SUGGESTIONS = ["Como funciona o empréstimo de livros?", "Como participo da Missão Quitério?", "Onde vejo meus livros e prazos?", "Me indica um livro de aventura disponível"];
const SHORTCUTS = [
  { tab: "inicio", label: "Início", icon: Home },
  { tab: "catalogo", label: "Catálogo", icon: BookOpen },
  { tab: "missao_quiterio", label: "Missão Quitério", icon: PawPrint },
  { tab: "ranking", label: "Ranking", icon: Trophy },
  { tab: "meu_historico", label: "Meu Histórico", icon: History },
] as const;

export function QuiterioChat({ books, onNavigate }: { books: Book[]; onNavigate: (tab: ActiveTab) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("gateway");
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setVoiceAvailable("speechSynthesis" in window);
    return () => { requestRef.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => { if (open && !loading) textareaRef.current?.focus(); }, [open, loading]);
  const stopVoice = () => { window.speechSynthesis?.cancel(); setSpeaking(null); };
  const speak = (text: string, index: number) => {
    stopVoice();
    if (speaking === index) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    utterance.lang = "pt-BR";
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase() === "pt-br");
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => { setSpeaking(null); setError("Não foi possível ler em voz alta neste navegador."); };
    setSpeaking(index);
    window.speechSynthesis.speak(utterance);
  };
  const close = () => {
    requestRef.current?.abort(); requestRef.current = null; stopVoice();
    setOpen(false); setLoading(false); setInput(""); setError(""); setSource("");
    setMessages([{ role: "assistant", content: GREETING }]);
  };
  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading || requestRef.current) return;
    stopVoice(); setError(""); setSource(""); setInput(""); setLoading(true);
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
          body: JSON.stringify({ messages: next.slice(-20), mode }), signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw err;
        append(localQuiterioAnswer(content, books)); setSource("Orientação local · conexão indisponível");
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
  return <>
    {!open && <Button onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-[60] h-24 w-24 overflow-hidden rounded-full p-0 border-2 border-primary bg-background quiterio-window" aria-label="Abrir Quitério — assistente de leitura"><QuiterioAgentMascot size={96} mood="happy" /></Button>}
    {open && <section aria-label="Conversa com Quitério" className="quiterio-window fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[400px] z-[60] bg-background text-foreground border border-border rounded-lg flex flex-col h-[min(740px,85dvh)] overflow-hidden">
      <div aria-hidden="true" className="quiterio-stripe h-1.5 w-full shrink-0" />
      <header className="px-3 py-3 flex items-center gap-2 border-b border-border bg-secondary">
        <QuiterioAgentMascot size={44} mood={loading || speaking !== null ? "talking" : "happy"} />
        <div className="flex-1 min-w-0"><h2 className="font-bold text-base">Quitério</h2><p className="text-xs text-muted-foreground">Seu guia de leitura 🐱</p></div>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar Quitério" title="Fechar"><X /></Button>
      </header>
      <nav aria-label="Atalhos da biblioteca" className="flex flex-wrap gap-1 p-2 border-b border-border">
        {SHORTCUTS.map(({ tab, label, icon: Icon }) => <Button key={tab} size="icon-sm" variant="ghost" aria-label={`Abrir ${label}`} title={label} onClick={() => { close(); onNavigate(tab); }}><Icon /></Button>)}
        <label className="ml-auto flex items-center"><span className="sr-only">Modo de resposta</span><select aria-label="Modo de resposta" value={mode} disabled={loading} onChange={e => setMode(e.target.value)} className="w-[132px] bg-secondary text-foreground border border-border rounded-md p-1 text-xs"><option value="gateway">Lovable AI</option><option value="gemini">Gemini 3.8 Flash</option><option value="local">Orientação local</option></select></label>
      </nav>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4 p-3">
          {messages.map((m, i) => <Message key={i} from={m.role}>
            <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
              {m.role === "assistant" ? m.content ? <MessageResponse>{m.content}</MessageResponse> : loading ? <Shimmer>Quitério está consultando...</Shimmer> : null : <p className="whitespace-pre-wrap break-words">{m.content}</p>}
            </MessageContent>
            {m.role === "assistant" && m.content && voiceAvailable && !(loading && i === messages.length - 1) && <Button variant="ghost" size="icon-sm" aria-label={speaking === i ? "Parar leitura" : "Ler resposta em voz alta"} title={speaking === i ? "Parar leitura" : "Ler em voz alta"} onClick={() => speak(m.content, i)}>{speaking === i ? <VolumeX /> : <Volume2 />}</Button>}
          </Message>)}
        </ConversationContent><ConversationScrollButton />
      </Conversation>
      {source && <p className="px-3 pb-1 text-xs text-muted-foreground">{source}</p>}
      {error && <p role="alert" className="px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="px-3 py-2 flex flex-col gap-1 border-t border-border">
        {SUGGESTIONS.map(s => <Button key={s} variant="ghost" disabled={loading} onClick={() => send(s)} className="h-auto min-h-7 justify-start whitespace-normal text-left text-xs px-2 py-1">{s}</Button>)}
      </div>
      <div className="p-2 bg-secondary border-t border-border">
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputTextarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} maxLength={2000} placeholder="Pergunte ao Quitério..." aria-label="Pergunte ao Quitério" disabled={loading} className="min-h-[60px] max-h-[100px] text-foreground" />
          <PromptInputFooter className="justify-end"><PromptInputSubmit aria-label={loading ? "Parar resposta" : "Enviar pergunta"} status={loading ? "streaming" : "ready"} onStop={() => requestRef.current?.abort()} disabled={!loading && !input.trim()} /></PromptInputFooter>
        </PromptInput>
      </div>
    </section>}
  </>;
}
