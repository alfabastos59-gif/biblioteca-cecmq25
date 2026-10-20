// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Upload, 
  Check, 
  BookOpen, 
  AlertCircle,
  SwitchCamera,
  Layers,
  Barcode,
  Building,
  Calendar,
  Hash,
  MapPin,
  FileText,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { Book } from '../types';

export interface NovoLivroData {
  titulo: string;
  autor: string;
  isbn: string;
  categoria: string;
  editora: string;
  anoPublicacao: string;
  paginas: string;
  quantidade: number;
  localizacao: string;
  sinopse: string;
  capaUrl: string | null;
}

interface CadastrarLivroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (livro: NovoLivroData) => void;
  onRegisterBook?: (book: Book) => void;
}

export const CadastrarLivroModal: React.FC<CadastrarLivroModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRegisterBook,
}) => {
  // Estado de Autenticação / Login
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estado dos campos do formulário
  const [formData, setFormData] = useState<NovoLivroData>({
    titulo: '',
    autor: '',
    isbn: '',
    categoria: 'Literatura Brasileira',
    editora: '',
    anoPublicacao: '',
    paginas: '',
    quantidade: 1,
    localizacao: '',
    sinopse: '',
    capaUrl: null,
  });

  // Estados da Câmera
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Referências
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ao abrir o modal, resetar o login se necessário
  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setPasswordError(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Validar senha de acesso (aluno123)
  const handleValidatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = passwordInput.trim();

    if (cleanPassword === 'aluno123' || cleanPassword.toLowerCase() === 'aluno123') {
      setIsAuthorized(true);
      setPasswordError(null);
    } else {
      setPasswordError('Senha incorreta. Digite a senha correta para continuar.');
    }
  };

  // Iniciar fluxo da câmera
  const startCamera = async (facingMode: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu dispositivo não suporta acesso direto à câmera.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      setIsCameraActive(true);

      // Aguarda o elemento de vídeo ser renderizado e conecta o fluxo
      const attach = async (tries = 0) => {
        const v = videoRef.current;
        if (!v) {
          if (tries < 30) requestAnimationFrame(() => attach(tries + 1));
          return;
        }
        v.setAttribute('playsinline', 'true');
        v.muted = true;
        v.srcObject = stream;
        try { await v.play(); } catch (e) { console.warn('play()', e); }
      };
      attach();
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      let errorMsg = 'Não foi possível acessar a câmera. Verifique as permissões.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permissão negada. Permita o acesso à câmera no seu navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Nenhuma câmera detectada no seu dispositivo.';
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Parar fluxo da câmera
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Alternar entre câmera traseira e frontal
  const toggleCameraFacingMode = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Tirar a foto da capa usando Canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (cameraFacingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      setFormData((prev) => ({ ...prev, capaUrl: photoDataUrl }));
      stopCamera();
    }

    setTimeout(() => setIsCapturing(false), 200);
  };

  // Upload alternativo via arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, capaUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Limpar a foto atual da capa
  const removePhoto = () => {
    setFormData((prev) => ({ ...prev, capaUrl: null }));
  };

  // Atualizar valores do formulário
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantidade' ? Math.max(1, parseInt(value) || 1) : value,
    }));
  };

  // Submissão do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.autor.trim()) {
      alert('Por favor, preencha ao menos o Título e o Autor do livro.');
      return;
    }

    if (onSave) {
      onSave(formData);
    }

    if (onRegisterBook) {
      const defaultCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';
      const newBook: Book = {
        id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: formData.titulo.trim(),
        author: formData.autor.trim(),
        cover: formData.capaUrl || defaultCover,
        category: formData.categoria || 'Geral',
        rating: 5,
        reviewsCount: 0,
        status: 'disponivel',
        pages: parseInt(formData.paginas, 10) || 150,
        year: parseInt(formData.anoPublicacao, 10) || new Date().getFullYear(),
        publisher: formData.editora.trim() || 'Acervo Biblioteca',
        location: formData.localizacao.trim() || 'Estante Geral',
        synopsis: formData.sinopse.trim() || 'Sem descrição cadastrada.',
        isbn: formData.isbn.trim() || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        totalCopies: formData.quantidade || 1,
        availableCopies: formData.quantidade || 1,
      };
      onRegisterBook(newBook);
    }

    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      
      {/* ========================================================================= */}
      {/* TELA 1: AUTORIZAÇÃO / LOGIN COM SENHA (aluno123) - VISUAL DO SCREENSHOT   */}
      {/* ========================================================================= */}
      {!isAuthorized ? (
        <div 
          className="relative w-full max-w-[430px] bg-[#13072b] rounded-2xl shadow-2xl overflow-hidden border border-[#0d2a45] my-auto flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d273f]">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Cadastro de Livros
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Acesso protegido — digite a senha para continuar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#0a2338] hover:bg-[#112f4a] border border-[#14395a] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com Ícone e Formulário de Senha */}
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            
            {/* Ícone de Cadeado Amarelo com Moldura Brilhante */}
            <div className="w-16 h-16 rounded-2xl bg-[#081f33] border-2 border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.22)] flex items-center justify-center mb-5">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
              Autorização Necessária
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mb-6">
              O cadastro de novos livros é restrito. Digite a senha de autorização para liberar o formulário:
            </p>

            <form onSubmit={handleValidatePassword} className="w-full space-y-4">
              <div className="text-left">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  SENHA DE ACESSO
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Digite a senha..."
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 bg-[#03111d] border border-[#133756] focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {passwordError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#112435] hover:bg-[#18324a] text-slate-200 border border-[#1b3a56] font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>Liberar Cadastro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TELA 2: FORMULÁRIO DE CADASTRO COM CÂMERA NO MESMO TEMA DARK PREMIUM      */
        /* ========================================================================= */
        <div 
          className="relative w-full max-w-4xl bg-[#051829] rounded-2xl shadow-2xl overflow-hidden border border-[#0d2a45] my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho da Janela */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#03111d] border-b border-[#0d273f]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Cadastrar Novo Livro
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Acesso Liberado
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Preencha os dados do livro e fotografe a capa</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-[#0a2338] hover:bg-[#112f4a] border border-[#14395a] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com Formulário e Câmera */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Seção Esquerda: Fotografia da Capa (Câmera / Preview) */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider self-start mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  Fotografia da Capa
                </label>

                {/* Área de Visualização: Foto / Câmera / Placeholder */}
                <div className="relative w-full aspect-[3/4] max-w-[260px] bg-[#03111d] rounded-2xl overflow-hidden border-2 border-dashed border-[#133756] flex flex-col items-center justify-center shadow-inner group">
                  {/* 1. Quando a câmera está ligada */}
                  {isCameraActive ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                      />
                      
                      {/* Linhas guias para enquadrar a capa */}
                      <div className="absolute inset-4 border-2 border-amber-400/80 border-dashed rounded-lg pointer-events-none flex items-center justify-center">
                        <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded shadow backdrop-blur-xs">
                          Enquadre a capa aqui
                        </span>
                      </div>

                      {/* Botão de Alternar Câmera (Frontal / Traseira) */}
                      <button
                        type="button"
                        onClick={toggleCameraFacingMode}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-transform active:rotate-180 cursor-pointer border border-white/20"
                        title="Trocar câmera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>
                  ) : formData.capaUrl ? (
                    /* 2. Quando já existe uma foto capturada */
                    <div className="relative w-full h-full">
                      <img
                        src={formData.capaUrl}
                        alt="Capa do Livro"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-3 py-1.5 bg-[#0a2338] hover:bg-[#112f4a] text-white border border-[#14395a] rounded-lg text-xs font-semibold shadow flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          Refazer
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 3. Placeholder inicial */
                    <div className="p-6 text-center text-slate-400 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-[#081f33] border border-[#133756] flex items-center justify-center mb-3 text-amber-400 shadow-inner">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-medium text-slate-200">Nenhuma capa adicionada</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Fotografe com a câmera ou envie uma imagem
                      </p>
                    </div>
                  )}
                </div>

                {/* Alerta de erro de câmera */}
                {cameraError && (
                  <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-1.5 w-full max-w-[260px]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Botões de Ação da Câmera / Upload */}
                <div className="mt-3.5 flex flex-col w-full max-w-[260px] gap-2">
                  {isCameraActive ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        Capturar Foto
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="py-2.5 px-3 bg-[#112435] hover:bg-[#18324a] text-slate-300 border border-[#1b3a56] font-medium text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        Fotografar Capa
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 bg-[#081f33] hover:bg-[#0c2a44] text-slate-200 font-medium text-xs rounded-xl border border-[#133756] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        Carregar Arquivo de Imagem
                      </button>
                    </>
                  )}

                  {/* Input de arquivo invisível para fallback */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Seção Direita: Campos de Cadastro do Livro */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Título e Autor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Título do Livro *
                    </label>
                    <input
                      type="text"
                      name="titulo"
                      required
                      value={formData.titulo}
                      onChange={handleChange}
                      placeholder="Ex: Dom Casmurro"
                      className="w-full px-3.5 py-2.5 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Autor(a) / Autores *
                    </label>
                    <input
                      type="text"
                      name="autor"
                      required
                      value={formData.autor}
                      onChange={handleChange}
                      placeholder="Ex: Machado de Assis"
                      className="w-full px-3.5 py-2.5 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* ISBN, Categoria e Quantidade */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-amber-400" />
                      ISBN / Código
                    </label>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleChange}
                      placeholder="978-85-..."
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Categoria
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                    >
                      <option value="Literatura Brasileira">Literatura Brasileira</option>
                      <option value="Literatura Estrangeira">Literatura Estrangeira</option>
                      <option value="Infantojuvenil">Infantojuvenil</option>
                      <option value="Ficção Científica">Ficção Científica</option>
                      <option value="História & Geografia">História & Geografia</option>
                      <option value="Ciências & Matemática">Ciências & Matemática</option>
                      <option value="Didático / Escolar">Didático / Escolar</option>
                      <option value="Filosofia & Sociologia">Filosofia & Sociologia</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-amber-400" />
                      Exemplares
                    </label>
                    <input
                      type="number"
                      name="quantidade"
                      min="1"
                      value={formData.quantidade}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Editora, Ano e Localização */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-amber-400" />
                      Editora
                    </label>
                    <input
                      type="text"
                      name="editora"
                      value={formData.editora}
                      onChange={handleChange}
                      placeholder="Ex: Companhia das Letras"
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Ano
                    </label>
                    <input
                      type="text"
                      name="anoPublicacao"
                      maxLength={4}
                      value={formData.anoPublicacao}
                      onChange={handleChange}
                      placeholder="Ex: 2021"
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Localização / Estante
                    </label>
                    <input
                      type="text"
                      name="localizacao"
                      value={formData.localizacao}
                      onChange={handleChange}
                      placeholder="Ex: Estante B - Prateleira 2"
                      className="w-full px-3.5 py-2 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Sinopse / Resumo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Sinopse ou Observações
                  </label>
                  <textarea
                    name="sinopse"
                    rows={3}
                    value={formData.sinopse}
                    onChange={handleChange}
                    placeholder="Breve resumo da obra, estado de conservação, notas..."
                    className="w-full px-3.5 py-2.5 bg-[#03111d] border border-[#133756] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all resize-none shadow-inner"
                  />
                </div>

              </div>
            </div>

            {/* Rodapé com Botões de Ação */}
            <div className="pt-4 border-t border-[#0d273f] flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#1b3a56] text-slate-300 font-medium text-sm hover:bg-[#112435] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <Check className="w-4 h-4 text-slate-950" />
                Salvar Livro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CadastrarLivroModal;
