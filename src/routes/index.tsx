import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, StrictMode, useEffect, useState } from "react";

const LegacyApp = lazy(async () => {
  const [{ default: App }, { ThemeProvider }] = await Promise.all([
    import("../app/App.tsx"),
    import("../app/context/ThemeContext.tsx"),
  ]);
  return {
    default: () => (
      <StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StrictMode>
    ),
  };
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biblioteca Maria Quitéria" },
      {
        name: "description",
        content:
          "Sistema de gerenciamento e portal da Biblioteca Maria Quitéria com catálogo de livros, controle de empréstimos, relatórios e painel administrativo.",
      },
      { property: "og:title", content: "Biblioteca Maria Quitéria" },
      {
        property: "og:description",
        content:
          "Sistema de gerenciamento e portal da Biblioteca Maria Quitéria com catálogo de livros, controle de empréstimos, relatórios e painel administrativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <LegacyApp />
    </Suspense>
  );
}
