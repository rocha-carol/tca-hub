import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cria o cliente Supabase para uso no servidor.
// Permite acesso a sessão e cookies em páginas e rotas server-side.
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
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component — cookies não podem ser
            // modificados neste contexto. Em Server Actions, o set funciona
            // normalmente. O Middleware é responsável por manter a sessão ativa.
          }
        },
      },
    }
  );
}