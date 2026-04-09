import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllProfiles } from "@/services/profile-service";
import type { Profile } from "@/types/profile";

// Esta página usa leitura de cookies no servidor via Supabase.
// Por isso, a renderização deve ser dinâmica (server-side on demand).
export const dynamic = "force-dynamic";

/**
 * Página inicial da aplicação.
 *
 * Server Component (renderizado no servidor durante build/request).
 * Busca dados dos profiles e exibe em lista simples.
 *
 * Sem autenticação por enquanto — mostra todos os profiles.
 * Será filtrado depois por usuário logado.
 */
export default async function Home() {
  let profiles: Profile[] = [];
  let erro: string | null = null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    // Chamada à função de serviço para buscar profiles.
    profiles = await fetchAllProfiles();
  } catch (e) {
    // Captura erro e armazena mensagem para exibir.
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar profiles";
    console.error("Erro na página Home:", erro);
  }

  return (
    <main className="min-h-screen bg-transparent">
      {/* Cabeçalho da página */}
      <header className="bg-[#f8f8f2] backdrop-blur border-b border-lime-200 shadow-sm">
        <div className="tca-stripes h-1 w-full" />
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-extrabold tca-title-guide">TCA Hub</h1>
          <p className="text-slate-700 mt-2">
            Plataforma de apoio ao Trabalho Colaborativo de Autoria
          </p>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Bloco de sessão (MVP) */}
        <section className="mb-10">
          <div className="tca-soft-surface rounded-lg p-6 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-2 tca-stripes" aria-hidden="true" />
            {user ? (
              <>
                <h2 className="text-2xl font-semibold text-lime-800 mb-2">Bem-vinda de volta</h2>
                <p className="text-slate-700 mb-4">
                  Você está autenticada como <strong>{user.email}</strong>.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
                >
                  Ir para o Dashboard
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-lime-800 mb-2">Comece seu acesso</h2>
                <p className="text-slate-700 mb-4">Faça login ou crie sua conta para acessar o dashboard.</p>
                <div className="flex gap-3">
                  <Link
                    href="/auth/login"
                    className="inline-block bg-lime-700 hover:bg-lime-800 text-white font-medium px-4 py-2 rounded-md"
                  >
                    Fazer login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-block bg-yellow-200 hover:bg-yellow-300 text-lime-900 font-medium px-4 py-2 rounded-md"
                  >
                    Criar conta
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Seção de Profiles */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Usuários do Sistema
          </h2>

          {/* Mensagem de erro (se houver) */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                <strong>Erro:</strong> {erro}
              </p>
            </div>
          )}

          {/* Lista de profiles */}
          {profiles.length > 0 ? (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white border border-sky-100 rounded-lg p-4 shadow-sm hover:shadow-md transition"
                >
                  {/* Nome do usuário */}
                  <h3 className="font-semibold text-lg text-gray-900">
                    {profile.name}
                  </h3>

                  {/* Email */}
                  <p className="text-gray-600 text-sm mt-1">{profile.email}</p>

                  {/* Papel (role) com badge */}
                  <div className="mt-3 flex gap-2">
                    <span className="inline-block bg-lime-100 text-lime-800 text-xs font-semibold px-2 py-1 rounded">
                      {/* Exibe o papel em português */}
                      {profile.role === "student"
                        ? "Estudante"
                        : profile.role === "advisor"
                          ? "Orientador"
                          : "Coordenador"}
                    </span>

                    {/* Status ativo/inativo */}
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-1 rounded ${
                        profile.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {profile.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Data de criação */}
                  {profile.created_at && (
                    <p className="text-gray-500 text-xs mt-3">
                      Criado em:{" "}
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Mensagem quando não há profiles
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Nenhum profile encontrado no banco de dados.
              </p>
            </div>
          )}
        </section>

        {/* Resumo de dados */}
        <div className="mt-12 bg-gradient-to-r from-lime-50 to-yellow-50 border border-lime-200 rounded-lg p-4">
          <h3 className="font-semibold text-lime-900 mb-2">Resumo</h3>
          <p className="text-slate-700">
            Total de usuários: <strong>{profiles.length}</strong>
          </p>
        </div>
      </div>
    </main>
  );
}