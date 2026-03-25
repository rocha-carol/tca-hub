import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cria o cliente Supabase para uso no servidor.
// Permite acesso a sessão e cookies em rotas e páginas server-side.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Implementação adiada para uma etapa posterior.
        },
      },
    }
  );
}