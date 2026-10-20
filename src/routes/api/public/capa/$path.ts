import { createFileRoute } from "@tanstack/react-router";

// Serve as capas dos livros a partir do armazenamento privado.
// Mantém uma URL estável e pública (somente leitura de imagens de capa).
export const Route = createFileRoute("/api/public/capa/$path")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rawPath = decodeURIComponent(params.path ?? "");

        // Só permite nomes de arquivo simples (sem travessia de diretório).
        if (!/^[A-Za-z0-9._-]+$/.test(rawPath)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("capas").download(rawPath);

        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
