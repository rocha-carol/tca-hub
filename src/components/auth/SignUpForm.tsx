"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-service";
import type { AuthError, UserRole } from "@/types/auth";

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

  // Estado dos inputs
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "student" as UserRole,
    password: "",
    passwordConfirm: "",
  });

  // Estado de controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  /**
   * Validação básica do formulário
   */
  const validateForm = (): boolean => {
    // Limpar erros anteriores
    setError(null);
    setSuccessMessage(null);

    // Validar nome
    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return false;
    }

    if (formData.name.trim().length < 3) {
      setError("Nome deve ter pelo menos 3 caracteres");
      return false;
    }

    // Validar email
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }

    if (!formData.role) {
      setError("Selecione se a conta será de estudante, orientador ou coordenador");
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

    if (formData.password.length < 8) {
      setError("Senha deve ter pelo menos 8 caracteres");
      return false;
    }

    // Validar confirmação de senha
    if (formData.password !== formData.passwordConfirm) {
      setError("Senhas não conferem");
      return false;
    }

    return true;
  };

  /**
   * Handler para mudança de inputs
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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

    // Validar antes de enviar
    if (!validateForm()) {
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
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="w-full max-w-md mx-auto p-6 bg-white border border-lime-200 rounded-xl shadow-md"
    >
      <h2 className="text-2xl font-bold mb-6 text-lime-800">Criar Conta</h2>

      {feedbackMessage ? (
        <div
          className={`mb-4 rounded-xl border p-3 text-sm ${feedbackClassName}`}
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          {feedbackMessage}
        </div>
      ) : null}

      {/* Campo de nome */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Nome Completo
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={loading || Boolean(successMessage)}
          placeholder="Seu nome completo"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
      </div>

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
          disabled={loading || Boolean(successMessage)}
          placeholder="seu.email@exemplo.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de conta
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={loading || Boolean(successMessage)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        >
          {roleOptions.map((roleOption) => (
            <option key={roleOption.value} value={roleOption.value}>
              {roleOption.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-slate-600">
          {roleOptions.find((roleOption) => roleOption.value === formData.role)?.description}
        </p>
      </div>

      {/* Campo de senha */}
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Senha (mínimo 8 caracteres)
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          disabled={loading || Boolean(successMessage)}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
      </div>

      {/* Campo de confirmação de senha */}
      <div className="mb-6">
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
          Confirmar Senha
        </label>
        <input
          id="passwordConfirm"
          type="password"
          name="passwordConfirm"
          value={formData.passwordConfirm}
          onChange={handleChange}
          disabled={loading || Boolean(successMessage)}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
      </div>

      {/* Botão de submissão */}
      <button
        type="submit"
        disabled={loading || Boolean(successMessage)}
        className="w-full bg-lime-700 hover:bg-lime-800 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
      >
        {loading ? "Criando conta..." : successMessage ? "✓ Cadastro enviado" : "Criar Conta"}
      </button>

      {/* Link para login */}
      <p className="text-center mt-4 text-sm text-gray-600">
        Já tem conta?{" "}
        <a href="/auth/login" className="text-lime-700 hover:text-lime-800 font-medium">
          Faça login
        </a>
      </p>
    </form>
  );
}
