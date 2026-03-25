import { createClient } from "@/lib/supabase/server";

// Página inicial temporária para validar a conexão com o Supabase.
export default async function Home() {
  const supabase = await createClient();

  // Teste simples de leitura no Supabase.
  // Nesta etapa, apenas confirma se o cliente foi criado sem erro.
  const isConnected = !!supabase;

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">TCA Hub</h1>
        <p className="mt-4">
          {isConnected
            ? "Conexão com Supabase preparada."
            : "Falha ao preparar conexão com Supabase."}
        </p>
      </div>
    </main>
  );
}