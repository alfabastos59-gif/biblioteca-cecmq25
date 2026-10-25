import authorsData from './authors.json';

export type Author = (typeof authorsData)[number];

/** Remove acentos e normaliza o texto para buscas em português. */
export function normalizeAuthorText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/** Lista única e ordenada de nacionalidades presentes no acervo. */
export function listAuthorNationalities(): string[] {
  return [...new Set(authorsData.map((a) => a.nationality).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

interface FilterAuthorsParams {
  search: string;
  nationality: string;
  letter?: string;
}

/** Letra inicial (sem acento) usada no índice A–Z. */
export function authorInitial(name: string): string {
  return normalizeAuthorText(name).charAt(0).toUpperCase();
}

/** Aplica busca, nacionalidade e letra inicial e ordena alfabeticamente. */
export function filterAuthors({ search, nationality, letter = 'Todas' }: FilterAuthorsParams): Author[] {
  return authorsData
    .filter(
      (a) =>
        a.active !== false &&
        (nationality === 'Todas' || a.nationality === nationality) &&
        (letter === 'Todas' || authorInitial(a.name) === letter) &&
        normalizeAuthorText(`${a.name} ${a.role}`).includes(normalizeAuthorText(search)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
