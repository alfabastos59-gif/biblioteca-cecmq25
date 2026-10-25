import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowUpRight, Feather, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthorPortrait } from './AuthorPortrait';
import { AuthorDetailDialog } from './AuthorDetailDialog';
import { filterAuthors, listAuthorNationalities, type Author } from './authorFunctions';
import authorsData from './authors.json';

/** Página pública de Autores: busca, filtro por nacionalidade e detalhes de cada autor. */
export function AuthorsPage() {
  const [search, setSearch] = useState('');
  const [nationality, setNationality] = useState('Todas');
  const [selected, setSelected] = useState<Author | null>(null);
  const [letter, setLetter] = useState('Todas');
  const nationalities = useMemo(() => listAuthorNationalities(), []);
  const authors = useMemo(() => filterAuthors({ search, nationality, letter }), [search, nationality, letter]);

  return <div className="authors-page min-h-screen">
    <header className="authors-header"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link to="/" className="flex items-center gap-3 font-semibold"><Feather className="text-author-highlight" /><span>Biblioteca Maria Quitéria</span></Link>
      <Button asChild variant="ghost" className="author-control"><Link to="/"><ArrowLeft /> Biblioteca</Link></Button>
    </div></header>
    <main className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      <section className="authors-intro py-12 sm:py-16"><p className="mb-4 text-xs font-semibold uppercase tracking-widest text-author-highlight">Vozes da literatura • Pensador</p><h1 className="font-serif text-5xl sm:text-6xl">Autores</h1><p className="mt-5 max-w-xl text-lg text-author-muted">Histórias, ideias e palavras que atravessam gerações.</p><p className="mt-5 text-sm text-author-muted">{authorsData.length} autores · Biografias e citações</p></section>
      <div className="authors-toolbar mb-8 flex flex-col gap-4 border-y border-author-border py-5 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 size-5 text-author-muted" /><input aria-label="Pesquisar autores" placeholder="Pesquisar autor ou profissão" value={search} onChange={e => setSearch(e.target.value)} className="author-input h-11 w-full rounded-md border border-author-border bg-author-surface pl-11 pr-11 outline-none focus:border-author-highlight" />{search && <Button variant="ghost" size="icon" aria-label="Limpar pesquisa" onClick={() => setSearch('')} className="author-control absolute right-1 top-1"><X /></Button>}</div>
        <select aria-label="Nacionalidade" value={nationality} onChange={e => setNationality(e.target.value)} className="author-input h-11 rounded-md border border-author-border bg-author-surface px-3 sm:w-56"><option value="Todas">Todas as nacionalidades</option>{nationalities.map(n => <option key={n}>{n}</option>)}</select>
        <span className="text-sm text-author-muted">{authors.length} {authors.length === 1 ? 'autor' : 'autores'}</span>
      </div>
      <nav aria-label="Índice alfabético" className="mb-8 flex flex-wrap gap-1.5">{['Todas', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(l => <Button key={l} size="sm" variant={letter === l ? 'default' : 'ghost'} aria-pressed={letter === l} onClick={() => setLetter(l)} className={letter === l ? 'min-w-9' : 'author-control min-w-9'}>{l === 'Todas' ? 'Todos' : l}</Button>)}</nav>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{authors.map(author => <article key={author.id} className="author-card overflow-hidden rounded-lg border border-author-border bg-author-surface">
        <AuthorPortrait author={author} />
        <div className="p-5"><p className="mb-2 text-xs text-author-highlight">{author.nationality}{author.period ? ` · ${author.period}` : ''}</p><h2 className="font-serif text-2xl leading-tight">{author.name}</h2><p className="mt-2 min-h-10 text-sm text-author-muted">{author.role}</p><blockquote className="mt-4 line-clamp-3 min-h-16 border-l-2 border-author-highlight pl-3 text-sm italic leading-relaxed">“{author.featuredQuote}”</blockquote><Button variant="ghost" onClick={() => setSelected(author)} className="author-control mt-5 w-full justify-between px-0">Conhecer autor <ArrowUpRight /></Button></div>
      </article>)}</div>
      {!authors.length && <div className="py-20 text-center"><Feather className="mx-auto mb-4 text-author-highlight" /><h2 className="font-serif text-2xl">Nenhum autor encontrado</h2><Button variant="ghost" className="author-control mt-4" onClick={() => {setSearch('');setNationality('Todas');setLetter('Todas');}}>Limpar filtros</Button></div>}
      <footer className="mt-12 border-t border-author-border pt-6 text-sm text-author-muted">Biografias e citações: <a href="https://www.pensador.com/autores/" target="_blank" rel="noopener noreferrer" className="underline">Pensador</a></footer>
    </main>
    <AuthorDetailDialog author={selected} onClose={() => setSelected(null)} />
  </div>;
}
