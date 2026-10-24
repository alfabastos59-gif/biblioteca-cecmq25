import { useState } from 'react';
import { Feather } from 'lucide-react';
import type { Author } from './authorFunctions';

/** Retrato do autor com fallback para as iniciais quando a imagem falha. */
export function AuthorPortrait({ author, large = false }: { author: Author; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`author-portrait ${large ? 'author-portrait-large' : ''}`}>
      {author.photoUrl && !failed ? (
        <img
          src={author.photoUrl}
          alt={author.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="author-initials"
          aria-label={`Foto não disponível de ${author.name}`}
        >
          <Feather size={28} />
          <span>{author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
        </div>
      )}
    </div>
  );
}
