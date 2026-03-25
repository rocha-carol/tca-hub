import { createClient } from "@/lib/supabase/server";

// Página inicial temporária para validar a preparação do cliente Supabase.
export default async function Home() {
  const supabase = await createClient();

  // Confirma se o cliente foi criado sem erro.
  const conexaoPreparada = !!supabase;

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">TCA Hub</h1>
        <p className="mt-4">
          {conexaoPreparada
            ? "Conexão com Supabase preparada."
            : "Falha ao preparar conexão com Supabase."}
        </p>
      </div>
    </main>
  );
}