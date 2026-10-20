import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, Loader2 } from "lucide-react";
import { recomendarLivros, type RecomendacaoResult } from "@/lib/recomendacao.functions";
import type { Book } from "../types";

const ATALHOS = ["Aventura e ação", "Mistério e suspense", "História e biografias", "Poesia", "Leitura rápida"];

export function DicaQuiteriaModal({ isOpen, onClose, books, onOpenBook }: {
  isOpen: boolean; onClose: () => void; books: Book[]; onOpenBook: (b: Book) => void;
}) {
  const recomendar = useServerFn(recomendarLivros);
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<RecomendacaoResult | null>(null);
  if (!isOpen) return null;

  const enviar = async (texto: string) => {
    if (!texto.trim() || loading) return;
    setLoading(true); setRes(null);
    try { setRes(await recomendar({ data: { pedido: texto } })); }
    catch { setRes({ ok: false, erro: "falha_api", mensagem: "A Quitéria não conseguiu pensar agora. Tente de novo." }); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0a0416]/80 p-4" onClick={onClose}>
      <div id="dica-quiteria-modal" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#13072b] p-5 text-slate-100 shadow-2xl border border-[#3e196e]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-amber-400" /> Dica da Quitéria</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-sm text-slate-400">Conte do que você gosta e eu procuro nas estantes da nossa escola!</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {ATALHOS.map((a) => (
            <button key={a} disabled={loading} onClick={() => { setPedido(a); enviar(a); }} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50">{a}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(pedido); }} className="flex gap-2">
          <input id="dica-quiteria-input" value={pedido} onChange={(e) => setPedido(e.target.value)} maxLength={500} placeholder="Ex: gosto de mitologia e aventura" className="flex-1 rounded-xl border border-[#3e196e] bg-[#0c0420] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button type="submit" disabled={loading || !pedido.trim()} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">Pedir dica</button>
        </form>
        {loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Quitéria está procurando nas estantes...</p>}
        {res && !res.ok && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 border border-rose-500/30">{res.mensagem}</p>}
        {res && res.ok && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">{res.mensagem}</p>
            {res.livros.map((l) => {
              const book = books.find((b) => b.id === l.id);
              return (
                <div key={l.id} className="rounded-xl border border-[#3e196e] bg-[#1f0b3b] p-3">
                  <p className="font-semibold">{l.title}</p>
                  <p className="text-xs text-slate-400">{l.author}</p>
                  <p className="mt-1 text-sm text-slate-300">{l.motivo}</p>
                  {book && <button onClick={() => { onClose(); onOpenBook(book); }} className="mt-2 text-xs font-semibold text-amber-400 hover:underline">Ver ficha do livro →</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
