import { describe, it, expect, beforeEach } from 'vitest';
import { LIBRARY_RULES, validateLibraryLoan, renewLibraryDate } from '@/app/utils/libraryRules';
import { getMissionSeason, recordAttemptCompletion, addGamePoints, getStudentGameData, saveScoresMap } from '@/app/utils/quiterioScores';
import { localQuiterioAnswer } from '@/lib/quiterio-local';
import type { Loan } from '@/app/types';

const loan: Loan = { id: '1', studentName: 'Leitor', studentCode: 'ALU001', studentClass: '1A', bookId: 'book', bookTitle: 'Livro', bookAuthor: 'Autor', bookCover: '', loanDate: '20/10/2026', returnDate: '27/10/2026', status: 'em_andamento' };
describe('Library rules', () => {
  beforeEach(() => localStorage.clear());
  it('blocks a third simultaneous loan, including an overdue book', () => {
    expect(validateLibraryLoan(loan, [loan, { ...loan, id: '2', status: 'atrasado' }])).not.toBeNull();
    expect(validateLibraryLoan(loan, [loan, { ...loan, id: '2', status: 'devolvido' }])).toBeNull();
  });
  it('accepts 7 to 14 calendar days and rejects 21 days', () => {
    expect(validateLibraryLoan(loan, [])).toBeNull();
    expect(validateLibraryLoan({ ...loan, returnDate: '03/11/2026' }, [])).toBeNull();
    expect(validateLibraryLoan({ ...loan, returnDate: '10/11/2026' }, [])).not.toBeNull();
    expect(validateLibraryLoan({ ...loan, returnDate: '26/10/2026' }, [])).not.toBeNull();
  });
  it('renews the current deadline by 7 days across a month boundary', () => {
    expect(renewLibraryDate('27/10/2026')).toBe('03/11/2026');
  });
  it('allocates 20 minutes per question', () => {
    expect(LIBRARY_RULES.questionSeconds).toBe(1200);
  });
  it('stops after 5 attempts per student in the current season', () => {
    for (let i = 0; i < 7; i++) recordAttemptCompletion('001', 'Leitor', 'Livro');
    expect(getStudentGameData('001').attemptsCount).toBe(5);
  });
  it('starts a fresh season without previous-season attempt limits', () => {
    saveScoresMap({ '001': { studentCode: '001', studentName: 'Leitor', score: 100, correctAnswers: 1, totalAnswered: 1, attemptsCount: 5, season: String(Number(getMissionSeason()) - 1) } });
    expect(getStudentGameData('001').attemptsCount).toBe(0);
  });
  it('does not count question points twice in the book bulletin', () => {
    addGamePoints('001', 'Leitor', 100, true, 'Livro');
    recordAttemptCompletion('001', 'Leitor', 'Livro', '', '', 100, 1, 1);
    expect(getStudentGameData('001').bookScores?.Livro.points).toBe(100);
  });
  it('recommends only matching, available catalog entries', () => {
    const answer = localQuiterioAnswer('aventura disponível', [
      { title: 'Obra disponível', author: 'Autor', category: 'Aventura', synopsis: 'Uma viagem', availableCopies: 1 },
      { title: 'Obra emprestada', author: 'Autor', category: 'Aventura', synopsis: '', availableCopies: 0 },
    ]);
    expect(answer).toContain('Obra disponível');
    expect(answer).not.toContain('Obra emprestada');
  });
});