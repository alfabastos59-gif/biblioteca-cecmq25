import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Msg = { role: "user" | "assistant"; content: string };

async function carregarAcervo(): Promise<string> {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return "";
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const linhas: string[] = [];
  for (let from = 0; from < 3000; from += 1000) {
    const { data, error } = await sb.from("records").select("data").eq("collection", "books").range(from, from + 999);
    if (error) break;
    for (const r of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (r.data ?? {}) as any;
      const t = String(d.title ?? "").trim();
      if (!t) continue;
      const disp = Number(d.availableCopies ?? 1) > 0 ? "disponível" : "emprestado";
      const sin = String(d.synopsis ?? "").replace(/Cadastrado por:.*$/s, "").slice(0, 120);
      linhas.push(`"${t}" — ${d.author ?? ""} | ${d.category ?? ""} | ${disp}${sin ? ` | ${sin}` : ""}`);
    }
    if (!data || data.length < 1000) break;
  }
  return linhas.join("\n");
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/quiterio-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "Quitério não configurado");
        let messages: Msg[] = [];
        try {
          const body = await request.json();
          messages = (Array.isArray(body?.messages) ? body.messages : [])
            .filter((m: Msg) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
            .slice(-20)
            .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 2000) }));
        } catch {
          return json(400, "Pedido inválido");
        }
        if (!messages.length) return json(400, "Pedido vazio");

        const acervo = await carregarAcervo().catch(() => "");
        const systemPrompt = `Você é o **Quitério**, um gatinho assistente leitor da Biblioteca do Colégio Estadual do Campo Maria Quitéria - Tempo Integral.
Ajude os alunos a descobrirem livros do acervo. Seja amigável, breve, animado e use emojis com moderação 📚.
REGRAS:
- Recomende APENAS livros da lista do acervo abaixo. Nunca invente títulos.
- Pergunte sobre preferências quando o pedido for vago.
- Para cada sugestão, diga POR QUE o aluno pode gostar (1-2 frases).
- Se o livro estiver "emprestado", avise e ofereça uma alternativa disponível.
- Responda sempre em português do Brasil, com markdown leve.
- Mantenha conteúdo adequado para a escola.

ACERVO ATUAL:
${acervo || "(acervo vazio no momento)"}`;

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            reasoning_effort: "low",
            stream: true,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
          }),
          signal: request.signal,
        });
        if (!resp.ok || !resp.body) {
          console.error("Quiterio AI status", resp.status, await resp.text().catch(() => ""));
          if (resp.status === 429) return json(429, "Muitas mensagens. Aguarde um instante.");
          if (resp.status === 402) return json(402, "Créditos de IA esgotados.");
          return json(resp.status >= 400 ? resp.status : 500, "Erro no Quitério");
        }
        return new Response(resp.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
      },
    },
  },
});
