import { createFileRoute } from '@tanstack/react-router';
import { AuthorsPage } from '@/features/authors/AuthorsPage';

export const Route = createFileRoute('/autores')({
  head: () => ({ meta: [
    { title: 'Autores e citações | Biblioteca Maria Quitéria' },
    { name: 'description', content: 'Conheça os 69 autores do Pensador: retratos, biografias e citações na Biblioteca Maria Quitéria.' },
    { property: 'og:title', content: 'Autores | Biblioteca Maria Quitéria' },
    { property: 'og:description', content: 'Explore as biografias e citações de 69 autores e pensadores.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AuthorsPage,
});