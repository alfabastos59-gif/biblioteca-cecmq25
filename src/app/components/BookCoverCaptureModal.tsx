// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Upload,
  Link2,
  Smartphone,
  Sliders,
  Sparkles,
  Timer,
  AlertCircle,
  Move,
  Maximize2,
  Image as ImageIcon
} from 'lucide-react';
import { playCameraShutterSound } from '../utils/gameAudio';

export interface BookCoverCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, detectedMeta?: { title?: string; author?: string; category?: string; synopsis?: string }) => void;
  initialImage?: string;
  theme?: 'dark' | 'light';
}

type TabMode = 'camera' | 'upload' | 'url';
type FilterType = 'normal' | 'enhance' | 'vibrant' | 'mono';

export const BookCoverCaptureModal: React.FC<BookCoverCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  initialImage,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Review & Edit state (after photo taken or file uploaded)
  const [capturedRawImage, setCapturedRawImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100); // 50 to 150

  // AI recognition state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // URL input state
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlPreviewError, setUrlPreviewError] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const viewportBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta captura direta de vídeo. Use a Câmera do Smartphone.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setFacingMode(mode);
      setIsCameraActive(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() as any) || {};
        setHasTorch(Boolean(capabilities.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((err) => {
          console.warn('Erro ao reproduzir stream da câmera:', err);
        });
      }
    } catch (err: any) {
      console.error('Camera permission/hardware error:', err);
      let msg = 'Não foi possível acessar a câmera. Verifique as permissões de vídeo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador ou use o botão "Câmera do Smartphone".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera encontrada no dispositivo.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch not supported on this track:', e);
    }
  };

  // Toggle camera direction (front / back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Switch to live camera tab
  useEffect(() => {
    if (isOpen) {
      if (!capturedRawImage && activeTab === 'camera') {
        startCamera(facingMode);
      }
    } else {
      stopCamera();
      setCountdown(null);
      setCapturedRawImage(null);
      resetAdjustments();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Reset adjustments
  const resetAdjustments = () => {
    setRotation(0);
    setIsFlipped(false);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setActiveFilter('normal');
    setBrightness(100);
    setContrast(100);
    setAiError(null);
  };

  // Trigger Native Smartphone Camera (uses OS camera app)
  const triggerNativeCamera = () => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  };

  // Snap photo with smart auto-crop to the 3:4 book frame
  const takeSnapshot = () => {
    if (!videoRef.current || !viewportBoxRef.current) return;

    playCameraShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (!vWidth || !vHeight) return;

    // Calculate crop rectangle based on the 3:4 book guide relative to video container
    const container = viewportBoxRef.current.parentElement;
    const guideBox = viewportBoxRef.current;

    let sx = 0;
    let sy = 0;
    let sWidth = vWidth;
    let sHeight = vHeight;

    if (container && guideBox) {
      const cRect = container.getBoundingClientRect();
      const gRect = guideBox.getBoundingClientRect();

      // Video displayed aspect ratio
      const videoRatio = vWidth / vHeight;
      const containerRatio = cRect.width / cRect.height;

      let renderedW = cRect.width;
      let renderedH = cRect.height;
      let offsetX = 0;
      let offsetY = 0;

      // In object-cover, determine scale
      if (videoRatio > containerRatio) {
        renderedW = cRect.height * videoRatio;
        offsetX = (renderedW - cRect.width) / 2;
      } else {
        renderedH = cRect.width / videoRatio;
        offsetY = (renderedH - cRect.height) / 2;
      }

      const scale = vWidth / renderedW;

      // Relative box coords inside rendered video
      const boxLeft = gRect.left - cRect.left + offsetX;
      const boxTop = gRect.top - cRect.top + offsetY;

      sx = Math.max(0, boxLeft * scale);
      sy = Math.max(0, boxTop * scale);
      sWidth = Math.min(vWidth - sx, gRect.width * scale);
      sHeight = Math.min(vHeight - sy, gRect.height * scale);
    }

    // Target canvas with clean 3:4 book aspect ratio (e.g. 750 x 1000)
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // If user camera (selfie), mirror horizontally
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      stopCamera();
      setCapturedRawImage(dataUrl);
      resetAdjustments();
    }
  };

  // Snap with timer
  const handleStartTimerSnapshot = () => {
    if (countdown !== null) return;
    let current = 3;
    setCountdown(current);
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        setCountdown(null);
        takeSnapshot();
      } else {
        setCountdown(current);
      }
    }, 1000);
  };

  // Handle image file selection (smartphone camera capture or gallery upload)
  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    playCameraShutterSound();
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        stopCamera();
        setCapturedRawImage(result);
        resetAdjustments();
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL confirmation
  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setCapturedRawImage(urlInput.trim());
    resetAdjustments();
  };

  // Drag pan controls in review mode
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panX,
        y: e.touches[0].clientY - panY,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanX(e.touches[0].clientX - dragStart.x);
    setPanY(e.touches[0].clientY - dragStart.y);
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Generate finalized high quality 3:4 cropped image
  const generateFinalImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!capturedRawImage) {
        reject('Nenhuma imagem capturada');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const TARGET_W = 600;
        const TARGET_H = 800; // Perfect 3:4 portrait book ratio

        const canvas = document.createElement('canvas');
        canvas.width = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(capturedRawImage);
          return;
        }

        // Apply filters in canvas context
        let filterStr = '';
        if (activeFilter === 'enhance') {
          filterStr += 'contrast(135%) brightness(105%) saturate(110%) ';
        } else if (activeFilter === 'vibrant') {
          filterStr += 'saturate(140%) contrast(110%) ';
        } else if (activeFilter === 'mono') {
          filterStr += 'grayscale(100%) contrast(130%) ';
        }

        // Manual sliders
        if (brightness !== 100) {
          filterStr += `brightness(${brightness}%) `;
        }
        if (contrast !== 100) {
          filterStr += `contrast(${contrast}%) `;
        }

        ctx.filter = filterStr.trim() || 'none';

        ctx.save();
        // Move to center of canvas
        ctx.translate(TARGET_W / 2, TARGET_H / 2);

        // Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);

        // Apply flip
        if (isFlipped) {
          ctx.scale(-1, 1);
        }

        // Apply zoom and user pan
        ctx.scale(zoom, zoom);
        ctx.translate(panX * (TARGET_W / 300), panY * (TARGET_H / 400));

        // Draw image centered and scaled to cover
        const imgRatio = img.width / img.height;
        const targetRatio = TARGET_W / TARGET_H;
        let drawW = TARGET_W;
        let drawH = TARGET_H;

        if (imgRatio > targetRatio) {
          drawW = TARGET_H * imgRatio;
        } else {
          drawH = TARGET_W / imgRatio;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => {
        resolve(capturedRawImage);
      };
      img.src = capturedRawImage;
    });
  };

  // AI Recognition of book cover details using Gemini
  const handleAiRecognize = async () => {
    setIsAnalyzingAi(true);
    setAiError(null);

    try {
      const finalImage = await generateFinalImage();
      const base64Data = finalImage.replace(/^data:image\/\w+;base64,/, '');

      const response = await fetch('/api/detect-book-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      if (!response.ok) {
        // Fallback local simulated OCR / detection if backend not available
        throw new Error('API não disponível');
      }

      const data = await response.json();
      if (data && (data.title || data.author)) {
        onCapture(finalImage, {
          title: data.title,
          author: data.author,
          category: data.category,
          synopsis: data.synopsis,
        });
        onClose();
        return;
      }
    } catch (e) {
      console.warn('AI recognition fallback:', e);
      // Even if AI recognition fails or is offline, finalize image normally
      const finalImage = await generateFinalImage();
      onCapture(finalImage);
      onClose();
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Confirm and deliver final image
  const handleConfirmImage = async () => {
    try {
      const finalImage = await generateFinalImage();
      onCapture(finalImage);
      onClose();
    } catch (err) {
      console.error('Erro ao finalizar imagem:', err);
      if (capturedRawImage) {
        onCapture(capturedRawImage);
        onClose();
      }
    }
  };

  // Retake photo / start over
  const handleRetake = () => {
    setCapturedRawImage(null);
    resetAdjustments();
    if (activeTab === 'camera') {
      startCamera(facingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#13072b] border border-[#163650] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = '';
          }}
        />
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = '';
          }}
        />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#163650] bg-[#020e18]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Fotografar Capa do Livro
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Proporção 3:4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {capturedRawImage
                  ? 'Ajuste, gire ou recorte a foto antes de salvar no acervo'
                  : 'Enquadre a capa do livro na moldura vertical para melhor resultado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs (Visible when no photo captured yet) */}
        {!capturedRawImage && (
          <div className="flex items-center border-b border-[#163650] bg-[#031522] px-4 pt-2 shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'camera'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Câmera ao Vivo</span>
            </button>
            <button
              type="button"
              onClick={triggerNativeCamera}
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-all cursor-pointer border-b-2 border-transparent"
              title="Abre o aplicativo nativo da câmera do celular"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Câmera do Celular</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'upload'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Arquivo / Galeria</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'url'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Link URL</span>
            </button>
          </div>
        )}

        {/* Modal Main Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center custom-scrollbar min-h-[320px]">
          
          {/* ============================================================== */}
          {/* STEP 1: CAPTURE MODE (Live Camera Viewfinder)                  */}
          {/* ============================================================== */}
          {!capturedRawImage && activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="w-full max-w-md p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center my-6">
                  <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-rose-300 mb-1">Acesso à Câmera Bloqueado</h3>
                  <p className="text-xs text-rose-200/80 mb-4">{cameraError}</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={triggerNativeCamera}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      Usar Câmera Nativa do Celular
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer border border-[#163650]"
                    >
                      <Upload className="w-4 h-4" />
                      Enviar Foto da Galeria
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-md aspect-[3/4] max-h-[55vh] rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/60 shadow-2xl flex items-center justify-center group select-none">
                  {/* Camera Flash Animation */}
                  {isFlashing && (
                    <div className="absolute inset-0 z-40 bg-white animate-out fade-out duration-200 pointer-events-none" />
                  )}

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                      <span className="text-7xl font-extrabold text-white animate-ping">
                        {countdown}
                      </span>
                    </div>
                  )}

                  {/* Video Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-transform ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />

                  {/* Intelligent 3:4 Book Framing Vignette */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-6">
                    <div
                      ref={viewportBoxRef}
                      className="relative w-full h-full border-2 border-dashed border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.48)] flex flex-col justify-between p-3"
                    >
                      {/* Corner Accents */}
                      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Header hint */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enquadre a Capa do Livro</span>
                        </div>
                        {hasTorch && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`pointer-events-auto p-2 rounded-full backdrop-blur-md border transition-all ${
                              isTorchOn
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/30'
                                : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                            }`}
                            title="Ligar Lanterna / Flash"
                          >
                            {isTorchOn ? <Zap className="w-4 h-4 fill-slate-950" /> : <ZapOff className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Center alignment guide */}
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <div className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        </div>
                        <span className="text-[10px] text-white mt-1 font-mono tracking-widest uppercase">
                          Lombada / Capa
                        </span>
                      </div>

                      {/* Footer hint */}
                      <div className="text-center">
                        <span className="text-[10px] bg-black/60 text-slate-300 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                          O recorte vertical 3:4 será feito automaticamente
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Bar Quick Controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all active:rotate-180 cursor-pointer"
                      title="Alternar Câmera Frontal / Traseira"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStartTimerSnapshot}
                      className={`p-2.5 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                        countdown !== null
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
                      }`}
                      title="Disparo com Temporizador de 3 Segundos"
                    >
                      <Timer className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Viewfinder Action Bar */}
                  <div className="absolute bottom-3 inset-x-4 flex items-center justify-between z-20">
                    {/* Native phone camera shortcut */}
                    <button
                      type="button"
                      onClick={triggerNativeCamera}
                      className="p-3 rounded-2xl bg-black/65 hover:bg-black/85 text-emerald-400 border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                      title="Abrir app de câmera do celular"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Câmera Celular</span>
                    </button>

                    {/* Main Shutter Button */}
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="group relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer hover:border-emerald-300"
                      title="Capturar Foto da Capa"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500 group-hover:bg-emerald-400 group-active:scale-95 transition-all shadow-inner" />
                    </button>

                    {/* Pick from gallery shortcut */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-2xl bg-black/65 hover:bg-black/85 text-slate-300 hover:text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                      title="Carregar foto da galeria"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Galeria</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 1 (Alt): Upload or URL Input Mode                         */}
          {/* ============================================================== */}
          {!capturedRawImage && activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className="w-full max-w-md p-8 border-2 border-dashed border-[#163650] hover:border-emerald-500/80 rounded-3xl bg-[#020e18]/60 hover:bg-[#020e18] flex flex-col items-center justify-center text-center cursor-pointer transition-all group my-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#082032] border border-[#163650] flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:scale-105 transition-all shadow-inner mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">
                Clique ou arraste uma foto da capa
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Aceita arquivos JPG, PNG ou WEBP em qualquer resolução
              </p>
              <div className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm">
                Procurar no Computador / Celular
              </div>
            </div>
          )}

          {!capturedRawImage && activeTab === 'url' && (
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#020e18]/80 border border-[#163650] my-4">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Cole a URL direta da imagem da capa
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlPreviewError(false);
                  }}
                  placeholder="https://exemplo.com/capa-do-livro.jpg"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#031522] border border-[#163650] focus:border-emerald-500 focus:outline-none text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Abrir
                </button>
              </div>
              {urlInput && (
                <div className="mt-4 flex flex-col items-center">
                  <p className="text-[11px] text-slate-400 mb-2">Pré-visualização:</p>
                  <img
                    src={urlInput}
                    alt="Preview"
                    onError={() => setUrlPreviewError(true)}
                    className="w-24 h-32 object-cover rounded-xl border border-[#163650] shadow-md"
                  />
                  {urlPreviewError && (
                    <p className="text-[11px] text-rose-400 mt-2">
                      Não foi possível carregar a imagem deste endereço.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: POST-CAPTURE EDITOR & CROP STUDIO                      */}
          {/* ============================================================== */}
          {capturedRawImage && (
            <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200">
              
              {/* Studio Canvas / Viewport */}
              <div
                className="relative w-48 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/80 shadow-2xl cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Book Frame Aspect Guide */}
                <div className="absolute inset-0 pointer-events-none border border-emerald-400/40 rounded-2xl z-20" />

                {/* Rendered transformed image */}
                <img
                  src={capturedRawImage}
                  alt="Capa Capturada"
                  draggable={false}
                  className="w-full h-full object-cover transition-[filter] duration-150"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1}) scale(${zoom}) translate(${panX}px, ${panY}px)`,
                    filter: `
                      ${activeFilter === 'enhance' ? 'contrast(135%) brightness(105%) saturate(110%) ' : ''}
                      ${activeFilter === 'vibrant' ? 'saturate(140%) contrast(110%) ' : ''}
                      ${activeFilter === 'mono' ? 'grayscale(100%) contrast(130%) ' : ''}
                      brightness(${brightness}%) contrast(${contrast}%)
                    `.trim(),
                  }}
                />

                {/* Drag indicator badge */}
                <div className="absolute top-2.5 left-2.5 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  <span>Arraste p/ enquadrar</span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-mono border border-white/20">
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              {/* Editing Controls Toolbar */}
              <div className="w-full max-w-lg mt-4 space-y-3">
                
                {/* 1. Quick Transform Actions (Rotate, Flip, Zoom) */}
                <div className="p-2.5 rounded-2xl bg-[#020e18]/80 border border-[#163650] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r - 90) % 360)}
                      className="p-2 rounded-xl bg-[#082032] hover:bg-[#0f2e47] text-slate-200 hover:text-white border border-[#163650] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Girar 90° à esquerda"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-2 rounded-xl bg-[#082032] hover:bg-[#0f2e47] text-slate-200 hover:text-white border border-[#163650] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Girar 90° à direita"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">+90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFlipped((f) => !f)}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        isFlipped
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-[#082032] hover:bg-[#0f2e47] text-slate-200 border-[#163650]'
                      }`}
                      title="Espelhar Horizontalmente"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Espelhar</span>
                    </button>
                  </div>

                  {/* Zoom slider */}
                  <div className="flex items-center gap-2 flex-1 sm:max-w-[180px]">
                    <ZoomOut
                      className="w-3.5 h-3.5 text-slate-400 cursor-pointer"
                      onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                    />
                    <input
                      type="range"
                      min="0.7"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#082032] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <ZoomIn
                      className="w-3.5 h-3.5 text-slate-400 cursor-pointer"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={resetAdjustments}
                    className="text-[11px] text-slate-400 hover:text-rose-300 underline cursor-pointer px-2"
                  >
                    Redefinir
                  </button>
                </div>

                {/* 2. Style & Book Enhancement Presets */}
                <div className="p-2.5 rounded-2xl bg-[#020e18]/80 border border-[#163650]">
                  <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Filtro de Tratamento para Capa:</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('normal')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeFilter === 'normal'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#082032] text-slate-300 hover:bg-[#0e2a40]'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('enhance')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeFilter === 'enhance'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#082032] text-slate-300 hover:bg-[#0e2a40]'
                      }`}
                    >
                      📖 Nítido
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('vibrant')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeFilter === 'vibrant'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#082032] text-slate-300 hover:bg-[#0e2a40]'
                      }`}
                    >
                      🎨 Vívido
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('mono')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeFilter === 'mono'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#082032] text-slate-300 hover:bg-[#0e2a40]'
                      }`}
                    >
                      📄 P&B
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-4 border-t border-[#163650] bg-[#020e18]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {capturedRawImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-[#163650]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tirar Outra Foto</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmImage}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>Usar Esta Capa</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-400">
                A foto será ajustada no formato padrão da biblioteca (3:4).
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
