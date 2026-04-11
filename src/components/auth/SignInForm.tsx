"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/auth-service";
import type { AuthError } from "@/types/auth";

interface SignInFormProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  initialEmail?: string;
  initialPassword?: string;
  storageKey?: string;
  className?: string;
  showSignUpLink?: boolean;
}

/**
 * Componente de formulário de login (sign in).
 *
 * Funcionalidades:
 * - Campos: email, senha
 * - Validação básica de entrada
 * - Integração com auth-service.ts
 * - Feedback visual: loading, erros, sucesso
 * - Redirecionamento para dashboard após sucesso
 */
export default function SignInForm({
  title = "Fazer Login",
  description,
  submitLabel = "Fazer Login",
  initialEmail = "",
  initialPassword = "",
  storageKey,
  className = "",
  showSignUpLink = true,
}: SignInFormProps) {
  const router = useRouter();

  // Estado dos inputs
  const [formData, setFormData] = useState({
    email: initialEmail,
    password: initialPassword,
  });

  // Estado de controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      setFormData({
        email: initialEmail,
        password: initialPassword,
      });
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as { email?: string; password?: string };
      setFormData({
        email: parsed.email ?? initialEmail,
        password: initialPassword || parsed.password || "",
      });
    } catch {
      setFormData({
        email: initialEmail,
        password: initialPassword,
      });
    }
  }, [initialEmail, initialPassword, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(formData));
  }, [formData, storageKey]);

  /**
   * Validação básica do formulário
   */
  const validateForm = (): boolean => {
    // Limpar erros anteriores
    setError(null);

    // Validar email
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }

    // Regex básico para validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Email inválido");
      return false;
    }

    // Validar senha
    if (!formData.password) {
      setError("Senha é obrigatória");
      return false;
    }

    return true;
  };

  /**
   * Handler para mudança de inputs
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handler para submissão do formulário
   */
  const handleSubmit = async () => {

    // Validar antes de enviar
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Chamar serviço de autenticação
      await signIn({
        email: formData.email,
        password: formData.password,
      });

      // Se chegou aqui, login foi bem-sucedido
      setSuccess(true);

      // Aguardar um pouco para o usuário ver a mensagem de sucesso
      setTimeout(() => {
        // Redirecionar para o dashboard
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      // Extrair mensagem de erro
      const authError = err as AuthError;
      const errorMessage = authError.message || "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="form"
      aria-label="Formulário de login"
      className={`w-full max-w-md mx-auto p-6 bg-white border border-lime-200 rounded-xl shadow-md ${className}`.trim()}
    >
      <h2 className="text-2xl font-bold mb-2 text-lime-800">{title}</h2>
      {description ? <p className="text-sm text-slate-700 mb-6">{description}</p> : <div className="mb-6" />}

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Mensagem de sucesso */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Login realizado com sucesso! Redirecionando...
        </div>
      )}

      {/* Campo de email */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled={loading || success}
          placeholder="seu.email@exemplo.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
      </div>

      {/* Campo de senha */}
      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading || success}
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-12 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={loading || success}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 px-3 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58a2 2 0 102.83 2.83" />
                <path d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-1 2.2-2.72 4.05-4.86 5.2" />
                <path d="M6.61 6.61C4.58 8.06 2.95 9.94 2 12c.69 1.52 1.73 2.89 3 4" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Botão de submissão */}
      <button
        type="button"
        onClick={() => {
          void handleSubmit();
        }}
        disabled={loading || success}
        className="w-full bg-lime-700 hover:bg-lime-800 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
      >
        {loading ? "Fazendo login..." : success ? "✓ Login realizado!" : submitLabel}
      </button>

      {/* Link para cadastro */}
      {showSignUpLink ? (
        <p className="text-center mt-4 text-sm text-gray-600">
          Não tem conta?{" "}
          <a href="/auth/signup" className="text-lime-700 hover:text-lime-800 font-medium">
            Crie uma agora
          </a>
        </p>
      ) : null}
    </div>
  );
}
