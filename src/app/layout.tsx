import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import "./globals.css";

// Define os metadados básicos da aplicação.
// Esses dados aparecem em abas do navegador e ajudam na identificação do sistema.
export const metadata: Metadata = {
  title: "TCA Hub",
  description: "Plataforma para apoio ao Trabalho Colaborativo de Autoria",
};

// Estrutura principal da aplicação.
// Tudo que estiver dentro de "children" será renderizado nas páginas.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen text-slate-800 antialiased">
        <a href="#conteudo-principal" className="skip-link">
          Pular para o conteúdo principal
        </a>
        <AppHeader />
        <div id="conteudo-principal" tabIndex={-1} role="main">
          {children}
        </div>
      </body>
    </html>
  );
}