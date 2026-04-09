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
    <div className="min-h-screen bg-gradient-to-br from-[#f7f6ee] via-[#fdfbf2] to-[#eef4df] flex items-center justify-center p-4">
      <div className="w-full relative max-w-3xl">
        <div className="absolute inset-y-2 left-0 w-3 rounded-l-xl tca-stripes" aria-hidden="true" />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tca-title-guide mb-2">TCA Hub</h1>
          <p className="text-slate-700">Plataforma de Trabalho Colaborativo de Autoria</p>
        </div>

        <SignUpForm />

        <div className="text-center mt-8">
          <p className="text-sm text-slate-700">
            Ao se cadastrar, você concorda com nossos{" "}
            <a href="/terms" className="text-lime-700 hover:text-lime-800 underline">
              Termos de Serviço
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
