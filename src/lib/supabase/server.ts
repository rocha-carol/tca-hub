import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cria o cliente Supabase para uso no servidor.
// Permite acesso seguro a cookies e sessões.
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
          // Não utilizado no momento.
        },
      },
    }
  );
}