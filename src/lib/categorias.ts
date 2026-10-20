// Lista centralizada de categorias do acervo.
// Agrupada para uso em <Select> e reutilizada em toda a aplicação.

export const CATEGORIAS_GRUPOS: { grupo: string; itens: string[] }[] = [
  {
    grupo: "Ficção",
    itens: [
      "Romance", "Conto", "Novela", "Ficção científica", "Fantasia",
      "Terror (Horror)", "Suspense", "Mistério", "Policial", "Aventura",
      "Ação", "Drama", "Romance histórico", "Romance contemporâneo",
      "Romance de época", "Distopia", "Utopia", "Realismo mágico",
      "Ficção literária", "Ficção juvenil", "Infantil", "Humor", "Sátira",
      "Fábula", "Parábola", "Mitologia", "Épico", "Faroeste", "Steampunk",
      "Cyberpunk", "Space Opera", "Apocalíptico", "Pós-apocalíptico",
    ],
  },
  {
    grupo: "Não Ficção",
    itens: [
      "Biografia", "Autobiografia", "Memórias", "História", "Geografia",
      "Filosofia", "Sociologia", "Psicologia", "Antropologia", "Política",
      "Economia", "Administração", "Marketing", "Empreendedorismo",
      "Finanças", "Direito", "Educação", "Pedagogia", "Linguística",
      "Religião", "Espiritualidade", "Autoajuda", "Desenvolvimento pessoal",
      "Saúde", "Medicina", "Enfermagem", "Nutrição", "Educação física",
      "Ciência", "Física", "Química", "Biologia", "Astronomia", "Matemática",
      "Estatística", "Informática", "Programação", "Inteligência Artificial",
      "Segurança da Informação", "Engenharia", "Arquitetura", "Agricultura",
      "Meio ambiente", "Ecologia",
    ],
  },
  {
    grupo: "Artes e Cultura",
    itens: [
      "Arte", "Pintura", "Escultura", "Fotografia", "Cinema", "Teatro",
      "Música", "Dança", "Moda", "Design", "Artesanato",
    ],
  },
  {
    grupo: "Literatura",
    itens: [
      "Poesia", "Crônicas", "Ensaios", "Correspondências", "Discursos",
      "Antologias", "Coletâneas",
    ],
  },
  {
    grupo: "Educação e Referência",
    itens: [
      "Dicionários", "Enciclopédias", "Atlas", "Guias", "Manuais",
      "Livros didáticos", "Livros técnicos", "Apostilas", "Gramáticas",
    ],
  },
  {
    grupo: "Negócios",
    itens: [
      "Liderança", "Gestão de pessoas", "Gestão de projetos",
      "Recursos Humanos", "Vendas", "Negociação", "Inovação", "Startups",
      "Comércio exterior",
    ],
  },
  {
    grupo: "Tecnologia",
    itens: [
      "Desenvolvimento Web", "Desenvolvimento Mobile", "Ciência de Dados",
      "Banco de Dados", "Redes", "Computação em Nuvem", "DevOps",
      "Blockchain", "Robótica", "Internet das Coisas (IoT)",
    ],
  },
  {
    grupo: "Casa e Lazer",
    itens: [
      "Culinária", "Gastronomia", "Jardinagem", "Decoração",
      "Faça você mesmo (DIY)", "Viagens", "Turismo", "Esportes", "Jogos",
      "Caça e pesca", "Pets",
    ],
  },
  {
    grupo: "Quadrinhos",
    itens: ["HQs", "Mangás", "Graphic Novels", "Webtoons"],
  },
  {
    grupo: "Infantojuvenil",
    itens: [
      "Livros ilustrados", "Primeira leitura", "Contos de fadas",
      "Livros educativos", "Livros interativos",
    ],
  },
  {
    grupo: "Acadêmicos",
    itens: [
      "Teses", "Dissertações", "Monografias", "Artigos científicos",
      "Pesquisa acadêmica",
    ],
  },
  {
    grupo: "Livros Religiosos",
    itens: [
      "Bíblia", "Estudos bíblicos", "Teologia", "Devocionais",
      "Comentários bíblicos", "Apologética", "Livros litúrgicos",
      "Religiões comparadas",
    ],
  },
  {
    grupo: "Idiomas",
    itens: [
      "Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Japonês",
      "Chinês", "Português para estrangeiros",
    ],
  },
  {
    grupo: "Desenvolvimento Pessoal",
    itens: [
      "Produtividade", "Inteligência emocional", "Comunicação", "Oratória",
      "Hábitos", "Motivação", "Carreira", "Mindfulness",
    ],
  },
  {
    grupo: "Gêneros Especiais",
    itens: [
      "LGBTQIA+", "Feminismo", "Diversidade", "Inclusão", "Ficção cristã",
      "Romance cristão", "Ficção militar", "Espionagem",
    ],
  },
  { grupo: "Outros", itens: ["Outros"] },
];

// Lista plana (deduplicada, preservando a ordem de primeira ocorrência).
export const CATEGORIAS: string[] = Array.from(
  new Set(CATEGORIAS_GRUPOS.flatMap((g) => g.itens)),
);
