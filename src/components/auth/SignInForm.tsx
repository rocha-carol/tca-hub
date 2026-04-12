"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "@/lib/auth/auth-service";
import type { AuthError } from "@/types/auth";
import { Button } from "@/components/ui/Button";

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
        // Força uma nova navegação completa para que a sessão recém-criada
        // seja lida no servidor já no primeiro carregamento do dashboard.
        if (typeof window !== "undefined") {
          window.location.assign("/dashboard");
          return;
        }
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
      className={`tca-form-panel w-full max-w-md mx-auto overflow-hidden p-6 md:p-7 ${className}`.trim()}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tca-secondary)]">Acesso seguro</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-relaxed text-[var(--tca-text-soft)]">{description}</p> : null}
        </div>
        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          entrar
        </span>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="tca-feedback tca-feedback--error mb-4">
          {error}
        </div>
      )}

      {/* Mensagem de sucesso */}
      {success && (
        <div className="tca-feedback tca-feedback--success mb-4">
          ✓ Login realizado com sucesso! Redirecionando...
        </div>
      )}

      {/* Campo de email */}
      <div className="mb-4">
        <label htmlFor="email" className="tca-form-label">
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
          className="tca-input"
        />
      </div>

      {/* Campo de senha */}
      <div className="mb-6">
        <label htmlFor="password" className="tca-form-label">
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
            className="tca-input pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={loading || success}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-2 my-2 rounded-xl px-3 text-[var(--tca-text-soft)] transition-colors hover:bg-[var(--tca-surface-soft)] hover:text-[var(--tca-secondary)] disabled:text-gray-400"
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
      <Button
        type="button"
        onClick={() => {
          void handleSubmit();
        }}
        disabled={loading || success}
        size="lg"
        className="w-full"
      >
        {loading ? "Fazendo login..." : success ? "✓ Login realizado!" : submitLabel}
      </Button>

      {/* Link para cadastro */}
      {showSignUpLink ? (
        <p className="mt-5 text-center text-sm text-[var(--tca-text-soft)]">
          Não tem conta?{" "}
          <Link href="/auth/signup" className="font-semibold text-[var(--tca-primary)] hover:text-[var(--tca-primary-strong)]">
            Crie uma agora
          </Link>
        </p>
      ) : null}
    </div>
  );
}
