import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type Recomendacao = { id: string; title: string; author: string; motivo: string };
export type RecomendacaoResult =
  | { ok: true; mensagem: string; livros: Recomendacao[] }
  | { ok: false; erro: "sem_chave" | "falha_api" | "sem_livros" | "entrada_invalida"; mensagem: string };

type BookRow = { id: string; title: string; author: string; category: string; synopsis: string; disponivel: boolean };

async function carregarAcervo(): Promise<BookRow[]> {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("config");
  const sb = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const out: BookRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("records").select("id,data").eq("collection", "books").range(from, from + 999);
    if (error) throw new Error("db");
    for (const r of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (r.data ?? {}) as any;
      const title = String(d.title ?? "").trim();
      if (!title) continue;
      out.push({
        id: String(d.id ?? r.id),
        title,
        author: String(d.author ?? ""),
        category: String(d.category ?? ""),
        synopsis: String(d.synopsis ?? "").replace(/Cadastrado por:.*$/s, "").slice(0, 160),
        disponivel: Number(d.availableCopies ?? 1) > 0,
      });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const recomendarLivros = createServerFn({ method: "POST" })
  .inputValidator((input: { pedido: string }) => {
    const pedido = typeof input?.pedido === "string" ? input.pedido.trim().slice(0, 500) : "";
    return { pedido };
  })
  .handler(async ({ data }): Promise<RecomendacaoResult> => {
    if (!data.pedido) return { ok: false, erro: "entrada_invalida", mensagem: "Conte para a Quitéria o que você gosta de ler!" };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, erro: "sem_chave", mensagem: "A Dica da Quitéria ainda não foi configurada. Avise a equipe da biblioteca." };

    let acervo: BookRow[];
    try {
      acervo = await carregarAcervo();
    } catch {
      return { ok: false, erro: "falha_api", mensagem: "Não consegui consultar o acervo agora. Tente de novo em instantes." };
    }
    if (acervo.length === 0) return { ok: false, erro: "sem_livros", mensagem: "O acervo da escola ainda não tem livros cadastrados." };

    const lista = acervo
      .map((b) => `${b.id} | ${b.title} | ${b.author} | ${b.category} | ${b.disponivel ? "disponível" : "emprestado"} | ${b.synopsis}`)
      .join("\n");

    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-5.6-luna",
          reasoning_effort: "none",
          messages: [
            {
              role: "system",
              content:
                "Você é a Quitéria, mascote alegre da Biblioteca Maria Quitéria, falando com estudantes em português do Brasil. " +
                "Recomende de 1 a 3 livros EXCLUSIVAMENTE da lista do acervo fornecida (formato: id | título | autor | categoria | situação | sinopse). " +
                "Nunca invente livros. Use o id exato da lista. Prefira livros disponíveis. Seja breve, gentil e adequada para a escola.",
            },
            { role: "user", content: `ACERVO:\n${lista}\n\nPEDIDO DO ESTUDANTE: ${data.pedido}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "recomendacao",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["mensagem", "livros"],
                properties: {
                  mensagem: { type: "string" },
                  livros: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "motivo"],
                      properties: { id: { type: "string" }, motivo: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        }),
      });
    } catch {
      return { ok: false, erro: "falha_api", mensagem: "A Quitéria não conseguiu pensar agora. Tente de novo em instantes." };
    }
    if (!resp.ok) {
      console.error("AI gateway status", resp.status);
      const msg =
        resp.status === 401
          ? "A chave da Dica da Quitéria é inválida. Avise a equipe da biblioteca."
          : resp.status === 429 || resp.status === 402
            ? "A Quitéria está descansando (limite de uso atingido). Tente mais tarde."
            : "A Quitéria não conseguiu pensar agora. Tente de novo em instantes.";
      return { ok: false, erro: resp.status === 401 ? "sem_chave" : "falha_api", mensagem: msg };
    }
    try {
      const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as { mensagem?: string; livros?: { id: string; motivo: string }[] };
      const byId = new Map(acervo.map((b) => [b.id, b]));
      const seen = new Set<string>();
      const livros: Recomendacao[] = [];
      for (const l of parsed.livros ?? []) {
        const b = byId.get(l.id);
        if (!b || seen.has(b.id)) continue; // descarta qualquer livro fora do acervo
        seen.add(b.id);
        livros.push({ id: b.id, title: b.title, author: b.author, motivo: l.motivo });
        if (livros.length === 3) break;
      }
      if (livros.length === 0) return { ok: false, erro: "sem_livros", mensagem: "Não encontrei no acervo um livro que combine. Tente descrever de outro jeito!" };
      return { ok: true, mensagem: parsed.mensagem ?? "Separei estas dicas para você:", livros };
    } catch {
      return { ok: false, erro: "falha_api", mensagem: "A Quitéria se confundiu com a resposta. Tente de novo." };
    }
  });
