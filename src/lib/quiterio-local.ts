export interface CatalogEntry { title: string; author: string; category: string; availableCopies: number; synopsis: string }
export const QUITERIO_RULES = `Empréstimos: até 2 livros simultâneos; prazo de 7 a 14 dias corridos; renovação online em Meu Histórico ou presencial na biblioteca, acrescentando 7 dias ao prazo atual.
Missão Quitério: obrigatório ter emprestado o livro antes de participar. Identifique-se com Código do Aluno, escolha um livro do seu histórico; até 20 minutos por pergunta e 5 tentativas por aluno por temporada. Respostas corretas valem 100 pontos; confira pontos e medalhas no Boletim da Missão e classificação por turmas no Ranking.
Início: destaques, novidades e resumo do ranking. Catálogo: busca por título e autor, filtros por gênero e disponibilidade, sinopse e solicitação de empréstimo com Código do Aluno. Meu Histórico: livros em posse, prazos e renovação. Nunca afirme que realizou um empréstimo ou renovação pelo chat. Use os botões das abas.`;

export function localQuiterioAnswer(question: string, books: CatalogEntry[]): string {
  const text = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/missao|tentativ|pergunta|medalh/.test(text)) return '**Missão Quitério** 🐾\n\nVocê precisa ter **emprestado o livro**. Entre com seu Código do Aluno, escolha uma obra do seu histórico e responda ao desafio. São até **20 minutos por pergunta** e **5 tentativas por temporada**. Cada acerto vale **100 pontos**; confira seu Boletim e o Ranking.';
  if (/historico|prazo|renov|meus livros/.test(text)) return 'Abra **Meu Histórico** e entre com seu Código do Aluno para ver os livros com você e os prazos. O botão **Renovar +7 dias** acrescenta 7 dias à devolução atual. Você também pode renovar presencialmente na biblioteca.';
  if (/emprestimo|emprestar|funciona/.test(text)) return 'Você pode pegar até **2 livros simultâneos**, por **7 a 14 dias corridos**. Abra o **Catálogo**, escolha um livro disponível, veja a sinopse e solicite o empréstimo com seu **Código do Aluno**. Renove online em **Meu Histórico** (+7 dias) ou presencialmente.';
  if (/ranking|podio/.test(text)) return 'Abra **Ranking** para conferir o pódio da escola, a classificação por turmas e seus pontos. Seu Boletim fica na **Missão Quitério**.';
  const terms = text.split(/\W+/).filter(t => t.length > 3 && !['livro','livros','indica','disponivel','quero','algo','para','hoje'].includes(t));
  const candidates = books.filter(b => b.availableCopies > 0).map(book => {
    const haystack = `${book.title} ${book.category} ${book.synopsis}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return { book, score: terms.filter(t => haystack.includes(t)).length };
  }).filter(b => b.score > 0).sort((a,b) => b.score - a.score).slice(0,3);
  if (!candidates.length) return 'Não encontrei uma obra disponível que corresponda a esse pedido no acervo atual. Consulte o **Catálogo** ou me diga outro tema: aventura, poesia, romance ou saberes do campo.';
  return 'Encontrei estas opções **disponíveis no acervo** 📚\n\n' + candidates.map(({book}) => `- **${book.title}**, de ${book.author} — ${book.category}. ${book.synopsis.slice(0,180)}`).join('\n\n') + '\n\nAbra o **Catálogo** para conferir a ficha e solicitar o empréstimo.';
}