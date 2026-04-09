import type { PedagogicalAIFeedbackResult } from "@/types/group-ai-feedback";

interface GeneratePedagogicalFeedbackInput {
  sectionTitle: string;
  sectionContent: string;
  focusPrompt?: string | null;
}

const TCA_PRIORITY_REFERENCE_DOCS = [
  {
    title: "Trabalho Colaborativo de Autoria (TCA)",
    url: "https://drive.google.com/file/d/1mnQPWEKlz8y1ZwCX1atY-9B-nM4JyHgm/view?pli=1",
  },
  {
    title: "Plano de Navegação do Autor",
    url: "https://drive.google.com/file/d/1S0uXh23jD7BWgZinsrnzMVaFRHubzzUs/view",
  },
] as const;

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Configure no arquivo .env ou .env.local.`
    );
  }

  return value;
}

function getRequiredReferenceContext(): string {
  const value = process.env.AI_FEEDBACK_REFERENCE_CONTEXT;
  if (!value || value.trim().length === 0) {
    throw new Error(
      "Variável obrigatória AI_FEEDBACK_REFERENCE_CONTEXT ausente. Inclua um resumo dos documentos prioritários do TCA no .env.local para gerar feedback com IA."
    );
  }

  return value.trim();
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Resposta da IA sem JSON válido para feedback pedagógico.");
  }

  const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonCandidate);
}

export async function generatePedagogicalFeedbackWithAI(
  input: GeneratePedagogicalFeedbackInput
): Promise<PedagogicalAIFeedbackResult> {
  const apiKey = getRequiredEnvironmentVariable("AI_FEEDBACK_API_KEY");
  const apiUrl = process.env.AI_FEEDBACK_API_URL?.trim() || "https://api.openai.com/v1/chat/completions";
  const modelName = process.env.AI_FEEDBACK_MODEL?.trim() || "gpt-4o-mini";
  const referenceContext = getRequiredReferenceContext();

  const referenceLinks = TCA_PRIORITY_REFERENCE_DOCS
    .map((doc, index) => `${index + 1}. ${doc.title}: ${doc.url}`)
    .join("\n");

  const prompt = [
    "Atue como especialista em orientação pedagógica de projetos de estudantes do ensino básico no Brasil.",
    "Considere que se trata de um projeto da prefeitura de São Paulo intitulado Trabalho Colaborativo de Autoria (TCA), desenvolvido por um grupo de estudantes do ensino fundamental II, com ênfase no 9º ano.",
    "Use prioritariamente os seguintes documentos de referência institucional do TCA:",
    referenceLinks,
    `Trechos de referência (usar como base prioritária):\n${referenceContext}`,
    "Analise o conteúdo da seção e devolva APENAS um JSON com as chaves:",
    "feedback_text, strengths, improvements, suggested_next_steps.",
    "Todos os campos devem ser texto em português do Brasil.",
    "Use linguagem construtiva, objetiva e acolhedora.",
    input.focusPrompt ? `Foco solicitado: ${input.focusPrompt}` : null,
    `Título da seção: ${input.sectionTitle}`,
    `Conteúdo da seção:\n${input.sectionContent}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Responda somente em JSON válido, sem markdown, sem texto adicional e sem explicações fora do JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao gerar feedback com IA: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const rawMessage = payload?.choices?.[0]?.message?.content;

  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    throw new Error("Resposta vazia da IA ao gerar feedback pedagógico.");
  }

  const parsed = extractJsonFromText(rawMessage) as Record<string, unknown>;

  const feedbackText = safeString(parsed.feedback_text);
  const strengths = safeString(parsed.strengths);
  const improvements = safeString(parsed.improvements);
  const suggestedNextSteps = safeString(parsed.suggested_next_steps);

  if (!feedbackText) {
    throw new Error("A IA não retornou o campo feedback_text de forma válida.");
  }

  return {
    feedback_text: feedbackText,
    strengths,
    improvements,
    suggested_next_steps: suggestedNextSteps,
    model_name: modelName,
  };
}
