import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Author } from './authorFunctions';
import { AuthorPortrait } from './AuthorPortrait';

interface AuthorDetailDialogProps {
  author: Author | null;
  onClose: () => void;
}

/** Janela com os detalhes do autor: biografia e citações. */
export function AuthorDetailDialog({ author, onClose }: AuthorDetailDialogProps) {
  return (
    <Dialog open={author !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="authors-page author-dialog max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border-author-border bg-author-surface p-0">
        {author && (
          <>
            <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr]">
              <AuthorPortrait key={author.id} author={author} large />
              <div className="pt-2">
                <p className="mb-2 text-sm text-author-highlight">
                  {author.nationality} {author.period && `· ${author.period}`}
                </p>
                <DialogTitle className="font-serif text-3xl">{author.name}</DialogTitle>
                <DialogDescription className="mt-3 text-author-muted">{author.role}</DialogDescription>
                <p className="mt-5 text-sm leading-relaxed">{author.bio || 'Biografia não disponível no arquivo.'}</p>
                <Button asChild variant="ghost" className="author-control mt-4 px-0">
                  <a href={author.referenceUrl} target="_blank" rel="noopener noreferrer">
                    Perfil no Pensador <ArrowUpRight />
                  </a>
                </Button>
              </div>
            </div>
            <section className="border-t border-author-border p-6">
              <h3 className="mb-5 font-serif text-2xl">Citações</h3>
              <div className="space-y-5">
                {[author.featuredQuote, ...author.additionalQuotes.map((q) => q.text)]
                  .filter((quote, i, all) => quote && all.indexOf(quote) === i)
                  .map((quote, i) => (
                    <blockquote key={i} className="border-l-2 border-author-highlight pl-4 text-sm leading-relaxed">
                      “{quote}”
                      <cite className="mt-2 block text-xs not-italic text-author-muted">
                        {author.name} · {author.quoteSource}
                      </cite>
                    </blockquote>
                  ))}
              </div>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
