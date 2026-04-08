import SignUpForm from "@/components/auth/SignUpForm";

/**
 * Página de cadastro (Sign Up).
 *
 * Esta é uma server component (página raiz).
 * Renderiza o formulário de cadastro com layout responsivo.
 *
 * Rota: /auth/signup
 */
export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">TCA Hub</h1>
          <p className="text-gray-600">Plataforma de Trabalho de Conclusão Autoral</p>
        </div>

        <SignUpForm />

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Ao se cadastrar, você concorda com nossos{" "}
            <a href="/terms" className="text-blue-500 hover:text-blue-700 underline">
              Termos de Serviço
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
