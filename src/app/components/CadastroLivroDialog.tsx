import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { CATEGORIAS_GRUPOS } from "@/lib/categorias";
import { supabase } from "../services/cloudClient";
import type { Book } from "../types";
import { toast } from "sonner";
import { Upload, Loader2, Camera, X, RefreshCw } from "lucide-react";

// Janela com fundo azul claro: campos brancos e texto escuro para ficar legível.
const FIELD = "bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-sky-500";
const LABEL = "text-slate-700";
const SOLID = "bg-sky-600 text-white hover:bg-sky-700";
const SOFT = "border-slate-300 bg-white text-slate-800 hover:bg-sky-50";

export function CadastroLivroDialog({ isOpen, onClose, onRegisterBook, existingBooks = [] }: {
  isOpen: boolean; onClose: () => void; onRegisterBook: (b: Book) => void; existingBooks?: Book[];
}) {
  const open = isOpen;
  const setOpen = (v: boolean) => { if (!v) onClose(); };
  const [authed, setAuthed] = useState(false);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [ano, setAno] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [categoria, setCategoria] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [cadastradoPor, setCadastradoPor] = useState("");
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCam = async (mode: "environment" | "user") => {
    stopCam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível acessar a webcam");
      setCamOpen(false);
    }
  };

  useEffect(() => {
    if (camOpen) startCam(facingMode);
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOpen, facingMode]);

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { toast.error("Câmera ainda carregando"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capa-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCapaFile(file);
      setPreview(URL.createObjectURL(blob));
      setCamOpen(false);
      toast.success("Foto capturada!");
    }, "image/jpeg", 0.9);
  };

  const reset = () => {
    setTitulo(""); setAutor(""); setIsbn(""); setAno(""); setQuantidade("1"); setCategoria("");
    setDescricao(""); setCadastradoPor("");
    setCapaFile(null); setPreview(null);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Imagem maior que 5MB"); return; }
    setCapaFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !autor.trim()) { toast.error("Preencha título e autor"); return; }
    setLoading(true);
    try {
      // Conferir duplicidade (mesmo título + autor, case-insensitive)
      const norm = (v: string) => v.trim().toLowerCase();
      const dup = existingBooks.find((bk) => norm(bk.title) === norm(titulo) && norm(bk.author) === norm(autor));
      if (dup) {
        toast.error(`Já existe um livro cadastrado: "${titulo.trim()}" de ${autor.trim()}`);
        setLoading(false);
        return;
      }
      let capa_url: string | null = null;
      if (capaFile) {
        const ext = (capaFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("capas").upload(path, capaFile, {
          contentType: capaFile.type || "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        capa_url = `/api/public/capa/${path}`;
      }

      const anoNum = ano.trim() ? parseInt(ano.trim(), 10) : null;
      const qtdNum = Math.max(1, parseInt(quantidade, 10) || 1);
      const novo: Book = {
        id: `book-${crypto.randomUUID()}`,
        title: titulo.trim(),
        author: autor.trim(),
        cover: capa_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
        category: categoria || "Geral",
        rating: 0,
        reviewsCount: 0,
        status: "disponivel",
        pages: 0,
        year: anoNum && !isNaN(anoNum) ? anoNum : new Date().getFullYear(),
        publisher: "",
        location: "",
        synopsis: descricao.trim() + (cadastradoPor.trim() ? `\n\nCadastrado por: ${cadastradoPor.trim()}` : ""),
        isbn: isbn.trim(),
        totalCopies: qtdNum,
        availableCopies: qtdNum,
      };
      onRegisterBook(novo);
      toast.success("Livro cadastrado!");
      reset(); setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao cadastrar livro: ${(err as Error)?.message ?? ""}`);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAuthed(false); setSenha(""); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-sky-100 border-sky-300 text-slate-900">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-slate-900">Cadastrar novo livro</DialogTitle>
          <DialogDescription className="text-sky-800">Compartilhe um livro com a biblioteca da escola.</DialogDescription>
        </DialogHeader>

        {!authed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (senha === "aluno123") { setAuthed(true); setSenha(""); }
              else { toast.error("Senha incorreta"); }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="senha" className={LABEL}>Senha de acesso</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoFocus
                required
                className={FIELD}
              />
            </div>
            <Button type="submit" className={`w-full ${SOLID}`} size="lg">Entrar</Button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className={LABEL}>Capa do livro</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center gap-3 cursor-pointer bg-white/60 hover:border-sky-500 transition-colors"
              >
                {preview ? (
                  <img src={preview} alt="prévia" className="h-20 w-14 object-cover rounded-md" />
                ) : (
                  <div className="h-20 w-14 rounded-md bg-sky-200 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-slate-600" />
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{capaFile ? capaFile.name : "Clique para enviar a imagem"}</p>
                  <p className="text-xs text-slate-500">PNG ou JPG, até 5MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`gap-2 flex-1 ${SOFT}`}
                  onClick={() => setCamOpen(true)}
                >
                  <Camera className="h-4 w-4" /> Tirar foto da capa
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="titulo" className={LABEL}>Título *</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required className={FIELD} />
            </div>
            <div>
              <Label htmlFor="autor" className={LABEL}>Autor *</Label>
              <Input id="autor" value={autor} onChange={(e) => setAutor(e.target.value)} maxLength={150} required className={FIELD} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="isbn" className={LABEL}>ISBN</Label>
                <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} maxLength={20} placeholder="978-..." className={FIELD} />
              </div>
              <div>
                <Label htmlFor="ano" className={LABEL}>Ano</Label>
                <Input id="ano" type="number" min={1000} max={2100} value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2024" className={FIELD} />
              </div>
              <div>
                <Label htmlFor="qtd" className={LABEL}>Quantidade</Label>
                <Input id="qtd" type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={FIELD} />
              </div>
            </div>
            <div>
              <Label htmlFor="categoria" className={LABEL}>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger id="categoria" className={`mt-1.5 ${FIELD}`}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-80 bg-white text-slate-900 border-slate-300">
                  {CATEGORIAS_GRUPOS.map((g) => (
                    <SelectGroup key={g.grupo}>
                      <SelectLabel className="text-slate-500">{g.grupo}</SelectLabel>
                      {g.itens.map((c) => (
                        <SelectItem key={c} value={c} className="focus:bg-sky-200 focus:text-slate-900">{c}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc" className={LABEL}>Descrição</Label>
              <Textarea id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} rows={3} className={FIELD} />
            </div>
            <div>
              <Label htmlFor="quem" className={LABEL}>Cadastrado por (seu nome)</Label>
              <Input id="quem" value={cadastradoPor} onChange={(e) => setCadastradoPor(e.target.value)} maxLength={100} className={FIELD} />
            </div>
            <Button type="submit" disabled={loading} className={`w-full ${SOLID}`} size="lg">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Cadastrar livro"}
            </Button>
          </form>
        )}
      </DialogContent>

      <Dialog open={camOpen} onOpenChange={(v) => { if (!v) stopCam(); setCamOpen(v); }}>
        <DialogContent className="max-w-md bg-sky-100 border-sky-300 text-slate-900">
          <DialogHeader>
            <DialogTitle className="font-display text-slate-900">Fotografar capa</DialogTitle>
            <DialogDescription className="text-sky-800">Posicione a capa do livro e capture.</DialogDescription>
          </DialogHeader>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4]">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={SOFT}
              onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
              title="Trocar câmera"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className={`gap-2 ${SOFT}`} onClick={() => setCamOpen(false)}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button type="button" className={`gap-2 flex-1 ${SOLID}`} onClick={capturarFoto}>
              <Camera className="h-4 w-4" /> Capturar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
