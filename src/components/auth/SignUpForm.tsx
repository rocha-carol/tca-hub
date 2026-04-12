"use client";

import Link from "next/link";
import { useState } from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-service";
import type { AuthError, UserRole } from "@/types/auth";

type SignUpFieldName = "name" | "email" | "role" | "password" | "passwordConfirm";
type SignUpFieldErrors = Partial<Record<SignUpFieldName, string>>;

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  {
    value: "student",
    label: "Estudante",
    description: "Acesso à jornada, grupo e desenvolvimento do projeto.",
  },
  {
    value: "advisor",
    label: "Orientador",
    description: "Acesso ao acompanhamento pedagógico dos grupos.",
  },
  {
    value: "coordinator",
    label: "Coordenador",
    description: "Acesso ao panorama institucional e à gestão do processo.",
  },
];

/**
 * Componente de formulário de cadastro (sign up).
 *
 * Funcionalidades:
 * - Campos: nome, email, senha, confirmação de senha
 * - Validação básica de entrada
 * - Integração com auth-service.ts
 * - Feedback visual: loading, erros, sucesso
 * - Redirecionamento para dashboard após sucesso
 */
export default function SignUpForm() {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const roleSelectRef = useRef<HTMLSelectElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordConfirmInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "student" as UserRole,
    password: "",
    passwordConfirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});

  const feedbackMessage = loading
    ? "Enviando cadastro..."
    : error
      ? error
      : successMessage;

  const feedbackClassName = loading
    ? "border-amber-300 bg-amber-50 text-amber-800"
    : error
      ? "border-red-300 bg-red-50 text-red-700"
      : "border-green-300 bg-green-50 text-green-700";

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    feedbackRef.current?.focus();
  }, [feedbackMessage]);

  /**
   * Validação básica do formulário
   */
  const validateForm = (): SignUpFieldErrors => {
    const validationErrors: SignUpFieldErrors = {};

    if (!formData.name.trim()) {
      validationErrors.name = "Nome é obrigatório.";
      return validationErrors;
    }

    if (formData.name.trim().length < 3) {
      validationErrors.name = "Nome deve ter pelo menos 3 caracteres.";
    }

    if (!formData.email.trim()) {
      validationErrors.email = "Email é obrigatório.";
      return validationErrors;
    }

    if (!formData.role) {
      validationErrors.role = "Selecione o tipo de conta: estudante, orientador ou coordenador.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      validationErrors.email = "Informe um email válido.";
    }

    if (!formData.password) {
      validationErrors.password = "Senha é obrigatória.";
    }

    if (formData.password.length < 8) {
      validationErrors.password = "Senha deve ter pelo menos 8 caracteres.";
    }

    if (formData.password !== formData.passwordConfirm) {
      validationErrors.passwordConfirm = "As senhas não conferem.";
    }

    return validationErrors;
  };

  const getRefByFieldName = (fieldName: SignUpFieldName) => {
    const refs = {
      name: nameInputRef,
      email: emailInputRef,
      role: roleSelectRef,
      password: passwordInputRef,
      passwordConfirm: passwordConfirmInputRef,
    };

    return refs[fieldName];
  };

  /**
   * Handler para mudança de inputs
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "name" || name === "email" || name === "role" || name === "password" || name === "passwordConfirm") {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handler para submissão do formulário
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const validationErrors = validateForm();
    setFieldErrors(validationErrors);

    const firstErrorField = Object.keys(validationErrors)[0] as SignUpFieldName | undefined;

    if (firstErrorField) {
      const firstInvalidFieldRef = getRefByFieldName(firstErrorField);
      setError(validationErrors[firstErrorField] ?? "Revise os campos destacados.");
      firstInvalidFieldRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Chamar serviço de autenticação
      const response = await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      });

      // Se chegou aqui, cadastro foi bem-sucedido
      if (response.requiresEmailConfirmation) {
        setSuccessMessage("Conta criada com sucesso! Verifique o email para confirmar o cadastro antes de entrar no sistema.");
        setFormData((prev) => ({
          ...prev,
          password: "",
          passwordConfirm: "",
        }));
        setTimeout(() => {
          router.push("/auth/login");
        }, 4000);
        return;
      }

      setSuccessMessage("Conta criada com sucesso! Redirecionando para a área inicial...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err) {
      // Extrair mensagem de erro
      const authError = err as AuthError;
      const errorMessage = authError.message || "Erro ao criar conta. Tente novamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      aria-label="Formulário de cadastro"
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="w-full max-w-md mx-auto p-6 bg-white border border-lime-200 rounded-xl shadow-md"
    >
      <h2 className="text-2xl font-bold mb-6 text-lime-800">Criar Conta</h2>

      {feedbackMessage ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={`mb-4 rounded-xl border p-3 text-sm ${feedbackClassName}`}
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          {feedbackMessage}
        </div>
      ) : null}

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Nome Completo
        </label>
        <input
          id="name"
          type="text"
          name="name"
          ref={nameInputRef}
          value={formData.name}
          onChange={handleChange}
          autoComplete="name"
          disabled={loading || Boolean(successMessage)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
          placeholder="Seu nome completo"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
        {fieldErrors.name ? (
          <p id="signup-name-error" className="mt-2 text-sm text-red-700">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          ref={emailInputRef}
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          disabled={loading || Boolean(successMessage)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          placeholder="seu.email@exemplo.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
        {fieldErrors.email ? (
          <p id="signup-email-error" className="mt-2 text-sm text-red-700">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de conta
        </label>
        <select
          id="role"
          name="role"
          ref={roleSelectRef}
          value={formData.role}
          onChange={handleChange}
          disabled={loading || Boolean(successMessage)}
          aria-invalid={Boolean(fieldErrors.role)}
          aria-describedby={fieldErrors.role ? "signup-role-error" : "signup-role-description"}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        >
          {roleOptions.map((roleOption) => (
            <option key={roleOption.value} value={roleOption.value}>
              {roleOption.label}
            </option>
          ))}
        </select>
        <p id="signup-role-description" className="mt-2 text-sm text-slate-600">
          {roleOptions.find((roleOption) => roleOption.value === formData.role)?.description}
        </p>
        {fieldErrors.role ? (
          <p id="signup-role-error" className="mt-2 text-sm text-red-700">
            {fieldErrors.role}
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Senha (mínimo 8 caracteres)
        </label>
        <input
          id="password"
          type="password"
          name="password"
          ref={passwordInputRef}
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading || Boolean(successMessage)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
        {fieldErrors.password ? (
          <p id="signup-password-error" className="mt-2 text-sm text-red-700">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="mb-6">
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
          Confirmar Senha
        </label>
        <input
          id="passwordConfirm"
          type="password"
          name="passwordConfirm"
          ref={passwordConfirmInputRef}
          value={formData.passwordConfirm}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading || Boolean(successMessage)}
          aria-invalid={Boolean(fieldErrors.passwordConfirm)}
          aria-describedby={fieldErrors.passwordConfirm ? "signup-password-confirm-error" : undefined}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
        {fieldErrors.passwordConfirm ? (
          <p id="signup-password-confirm-error" className="mt-2 text-sm text-red-700">
            {fieldErrors.passwordConfirm}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || Boolean(successMessage)}
        className="w-full bg-lime-700 hover:bg-lime-800 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
      >
        {loading ? "Criando conta..." : successMessage ? "✓ Cadastro enviado" : "Criar Conta"}
      </button>

      <p className="text-center mt-4 text-sm text-gray-600">
        Já tem conta?{" "}
        <Link href="/auth/login" className="text-lime-700 hover:text-lime-800 font-medium">
          Faça login
        </Link>
      </p>
    </form>
  );
}
