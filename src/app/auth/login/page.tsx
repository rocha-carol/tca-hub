import SignInForm from "@/components/auth/SignInForm";

/**
 * Página de login (Sign In).
 *
 * Esta é uma server component (página raiz).
 * Renderiza o formulário de login com layout responsivo.
 *
 * Rota: /auth/login
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">TCA Hub</h1>
          <p className="text-gray-600">Plataforma de Trabalho de Conclusão Autoral</p>
        </div>

        <SignInForm />

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Precisa de ajuda?{" "}
            <a href="/support" className="text-blue-500 hover:text-blue-700 underline">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
