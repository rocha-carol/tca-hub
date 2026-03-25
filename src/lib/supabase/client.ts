import { createBrowserClient } from "@supabase/ssr";

// Cria o cliente Supabase para uso no navegador.
// Utiliza variáveis de ambiente configuradas no projeto.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}