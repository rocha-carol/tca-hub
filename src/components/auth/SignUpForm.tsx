"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-service";
import type { AuthError } from "@/types/auth";

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
    password: "",
    passwordConfirm: "",
  });

  // Estado de controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Validação básica do formulário
   */
  const validateForm = (): boolean => {
    // Limpar erros anteriores
    setError(null);

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
    console.log("[SignUpForm] submit disparado");

    console.log("[SignUpForm] dados atuais:", {
      name: formData.name,
      email: formData.email,
      passwordLength: formData.password.length,
      passwordConfirmLength: formData.passwordConfirm.length,
    });

    // Validar antes de enviar
    if (!validateForm()) {
      console.log("[SignUpForm] validação falhou");
      return;
    }

    console.log("[SignUpForm] validação ok, iniciando signUp");

    try {
      setLoading(true);
      setError(null);

      // Chamar serviço de autenticação
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      console.log("[SignUpForm] signUp concluído com sucesso");

      // Se chegou aqui, cadastro foi bem-sucedido
      setSuccess(true);

      // Aguardar um pouco para o usuário ver a mensagem de sucesso
      setTimeout(() => {
        // Redirecionar para o dashboard
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      console.log("[SignUpForm] erro recebido no catch:", err);
      // Extrair mensagem de erro
      const authError = err as AuthError;
      const errorMessage = authError.message || "Erro ao criar conta. Tente novamente.";
      setError(errorMessage);
    } finally {
      console.log("[SignUpForm] finalizando submit, loading=false");
      setLoading(false);
    }
  };

  return (
    <div role="form" aria-label="Formulário de cadastro" className="w-full max-w-md mx-auto p-6 bg-white border border-lime-200 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-lime-800">Criar Conta</h2>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Mensagem de sucesso */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Conta criada com sucesso! Redirecionando...
        </div>
      )}

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
          disabled={loading || success}
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
          disabled={loading || success}
          placeholder="seu.email@exemplo.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
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
          disabled={loading || success}
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
          disabled={loading || success}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:bg-gray-100"
        />
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
        {loading ? "Criando conta..." : success ? "✓ Conta criada!" : "Criar Conta"}
      </button>

      {/* Link para login */}
      <p className="text-center mt-4 text-sm text-gray-600">
        Já tem conta?{" "}
        <a href="/auth/login" className="text-lime-700 hover:text-lime-800 font-medium">
          Faça login
        </a>
      </p>
    </div>
  );
}
