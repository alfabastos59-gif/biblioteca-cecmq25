// @ts-nocheck
import React from 'react';
import { CadastroLivroDialog } from './CadastroLivroDialog';
import { Book } from '../types';

export interface RegisterBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterBook: (book: Book) => void;
  existingBooks?: Book[];
}

export const RegisterBookModal: React.FC<RegisterBookModalProps> = ({ isOpen, onClose, onRegisterBook, existingBooks }) => (
  <CadastroLivroDialog isOpen={isOpen} onClose={onClose} onRegisterBook={onRegisterBook} existingBooks={existingBooks} />
);

export default RegisterBookModal;
