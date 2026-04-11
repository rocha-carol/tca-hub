import type { PedagogicalAIFeedbackResult } from "@/types/group-ai-feedback";

interface GeneratePedagogicalFeedbackInput {
  sectionTitle: string;
  sectionContent: string;
  focusPrompt?: string | null;
}

interface GenerateThemeIdeaSuggestionsInput {
  selectedTopics: string[];
}

export interface ThemeIdeaSuggestionResult {
  interest_summary: string;
  possible_paths: string[];
  conversation_starters: string[];
  model_name: string;
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

function getOptionalReferenceContext(): string | null {
  const value = process.env.AI_FEEDBACK_REFERENCE_CONTEXT;
  if (!value || value.trim().length === 0) {
    return null;
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

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => safeString(item))
    .filter((item): item is string => Boolean(item));
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

export async function generateThemeIdeaSuggestionsWithAI(
  input: GenerateThemeIdeaSuggestionsInput
): Promise<ThemeIdeaSuggestionResult> {
  const selectedTopics = input.selectedTopics
    .map((topic) => topic.trim())
    .filter(Boolean);

  if (selectedTopics.length === 0) {
    throw new Error("Selecione pelo menos um assunto para receber sugestões com IA.");
  }

  const apiKey = getRequiredEnvironmentVariable("AI_FEEDBACK_API_KEY");
  const apiUrl = process.env.AI_FEEDBACK_API_URL?.trim() || "https://api.openai.com/v1/chat/completions";
  const modelName = process.env.AI_FEEDBACK_MODEL?.trim() || "gpt-4o-mini";
  const referenceContext = getOptionalReferenceContext();

  const referenceLinks = TCA_PRIORITY_REFERENCE_DOCS
    .map((doc, index) => `${index + 1}. ${doc.title}: ${doc.url}`)
    .join("\n");

  const prompt = [
    "Atue como mediador pedagógico de projetos para estudantes do 9º ano do ensino fundamental II no contexto do TCA da prefeitura de São Paulo.",
    "Sua tarefa NÃO é escolher um tema final pelo grupo.",
    "Sua tarefa é abrir possibilidades, identificar interesses e sugerir caminhos de pesquisa de forma criativa, acolhedora e curta.",
    "Use linguagem em português do Brasil, acessível para adolescentes, sem tom professoral e sem transformar a resposta em redação longa.",
    "Use prioritariamente os seguintes documentos institucionais do TCA como referência de contexto:",
    referenceLinks,
    referenceContext ? `Trechos de referência institucional do TCA:\n${referenceContext}` : null,
    "Responda APENAS em JSON válido com as chaves:",
    "interest_summary, possible_paths, conversation_starters.",
    "interest_summary deve ser um texto curto, em 1 ou 2 frases.",
    "possible_paths deve ter exatamente 3 sugestões curtas de caminhos de pesquisa, sem impor um tema definitivo.",
    "conversation_starters deve ter exatamente 3 perguntas curtas para ajudar o grupo a conversar e escolher um recorte.",
    "Evite respostas genéricas demais como 'tecnologia' ou 'meio ambiente' sem recorte.",
    `Assuntos escolhidos pelo grupo: ${selectedTopics.join(", ")}`,
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
      temperature: 0.7,
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
    throw new Error(`Falha ao gerar sugestões com IA: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const rawMessage = payload?.choices?.[0]?.message?.content;

  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    throw new Error("Resposta vazia da IA ao gerar sugestões de tema.");
  }

  const parsed = extractJsonFromText(rawMessage) as Record<string, unknown>;

  const interestSummary = safeString(parsed.interest_summary);
  const possiblePaths = safeStringArray(parsed.possible_paths).slice(0, 3);
  const conversationStarters = safeStringArray(parsed.conversation_starters).slice(0, 3);

  if (!interestSummary) {
    throw new Error("A IA não retornou o campo interest_summary de forma válida.");
  }

  if (possiblePaths.length === 0) {
    throw new Error("A IA não retornou caminhos de pesquisa válidos.");
  }

  if (conversationStarters.length === 0) {
    throw new Error("A IA não retornou perguntas iniciais válidas.");
  }

  return {
    interest_summary: interestSummary,
    possible_paths: possiblePaths,
    conversation_starters: conversationStarters,
    model_name: modelName,
  };
}

const TOPIC_CONNECTIONS: Array<{
  topics: string[];
  path: string;
  question: string;
}> = [
  {
    topics: ["música", "algoritmos", "internet"],
    path: "como plataformas digitais influenciam o gosto musical dos jovens",
    question: "O que no gosto musical do grupo parece escolha própria e o que pode estar sendo empurrado pelas plataformas?",
  },
  {
    topics: ["cinema", "arte", "identidade"],
    path: "como filmes e séries representam diferentes grupos, territórios e estilos de vida",
    question: "Quais histórias aparecem muito nas telas e quais quase não ganham espaço?",
  },
  {
    topics: ["teatro", "emoções", "comportamento"],
    path: "como expressão artística ajuda a falar de sentimentos, conflitos e convivência",
    question: "De que formas arte e performance podem ajudar jovens a falar do que sentem?",
  },
  {
    topics: ["ciência", "física", "esportes"],
    path: "como a ciência aparece no corpo em movimento, no esporte e nas manobras do dia a dia",
    question: "Onde a física aparece em movimentos que parecem naturais, mas exigem equilíbrio, força e estratégia?",
  },
  {
    topics: ["cientistas", "história", "invenções"],
    path: "quem ganha visibilidade quando se fala em ciência e quem costuma ficar de fora dessa narrativa",
    question: "Quais cientistas e inventores a escola destaca e quais trajetórias quase não aparecem?",
  },
  {
    topics: ["cidade", "mobilidade", "periferia"],
    path: "como a mobilidade urbana muda o tempo, as oportunidades e a rotina em diferentes bairros",
    question: "A cidade funciona do mesmo jeito para todos ou cada território vive um mapa diferente?",
  },
  {
    topics: ["clima", "natureza", "cidade"],
    path: "como clima, enchentes, calor e áreas verdes afetam mais alguns territórios do que outros",
    question: "Por que alguns lugares sofrem mais com calor, alagamento ou falta de áreas verdes?",
  },
  {
    topics: ["internet", "memes", "comportamento"],
    path: "como memes, trends e humor online ajudam a espalhar opiniões e comportamentos",
    question: "Quando um meme parece só brincadeira e quando ele também influencia a forma de pensar?",
  },
  {
    topics: ["saúde mental", "emoções", "escola"],
    path: "o que afeta o bem-estar emocional dos adolescentes dentro e fora da escola",
    question: "Quais situações do cotidiano mais pesam no humor, na energia e na saúde mental dos jovens?",
  },
  {
    topics: ["tecnologia", "futuro", "trabalho"],
    path: "como novas tecnologias podem mudar profissões, estudos e escolhas de vida dos adolescentes",
    question: "Quais mudanças tecnológicas já estão afetando o jeito de estudar, trabalhar e imaginar o futuro?",
  },
];

const TOPIC_FALLBACKS: Record<string, { path: string; question: string }> = {
  música: {
    path: "como música, memória, identidade e redes sociais se conectam no dia a dia dos jovens",
    question: "Por que certas músicas marcam fases da vida e viram parte da identidade de alguém?",
  },
  cinema: {
    path: "como o cinema influencia percepções sobre sociedade, beleza, poder e pertencimento",
    question: "O que filmes e séries ensinam sem parecer que estão ensinando?",
  },
  teatro: {
    path: "como o teatro pode ajudar a discutir convivência, emoção e participação social",
    question: "Por que representar uma história pode fazer alguém enxergar um problema de outro jeito?",
  },
  arte: {
    path: "como arte pode expressar problemas sociais, identidades e modos de viver",
    question: "Quando uma arte só decora e quando ela também questiona o mundo?",
  },
  ciência: {
    path: "como a ciência aparece em situações comuns que muita gente nem percebe",
    question: "Que coisas do cotidiano parecem simples, mas têm muita ciência por trás?",
  },
  cientistas: {
    path: "como trajetórias de cientistas revelam disputas por reconhecimento, acesso e visibilidade",
    question: "Quem costuma ser lembrado como cientista e quem quase nunca entra nessa conversa?",
  },
  invenções: {
    path: "como invenções transformam hábitos, relações e formas de viver em sociedade",
    question: "Quais invenções mudaram tanto a vida que hoje parecem invisíveis?",
  },
  memes: {
    path: "como memes funcionam como linguagem, humor e influência nas redes",
    question: "O que faz uma piada virar linguagem de uma geração inteira?",
  },
  internet: {
    path: "como a internet molda formas de aprender, se informar e se relacionar",
    question: "O que a internet facilitou de verdade e o que ela complicou sem a gente notar?",
  },
  algoritmos: {
    path: "como algoritmos influenciam o que aparece, o que some e o que viraliza nas telas",
    question: "Quem decide o que chega até cada pessoa nas redes: a pessoa ou o sistema?",
  },
  esportes: {
    path: "como esporte mistura corpo, estratégia, ciência e cultura",
    question: "O que existe por trás de um movimento esportivo além de treino e talento?",
  },
  emoções: {
    path: "como emoções interferem nas decisões, relações e experiências dos adolescentes",
    question: "Como sentimentos influenciam escolhas mesmo quando ninguém percebe?",
  },
  corpo: {
    path: "como corpo, imagem, saúde e identidade se cruzam no cotidiano dos jovens",
    question: "De que forma o corpo vira assunto social e não só biológico?",
  },
  cidade: {
    path: "como a cidade oferece experiências muito diferentes dependendo do território",
    question: "A mesma cidade parece igual para todo mundo?",
  },
  periferia: {
    path: "como a periferia é vivida, narrada e representada por quem mora nela e por quem olha de fora",
    question: "Quem conta as histórias da periferia e com quais interesses?",
  },
  natureza: {
    path: "como natureza e vida urbana se conectam de formas que passam despercebidas",
    question: "O que muda na vida das pessoas quando a natureza some do cotidiano?",
  },
  clima: {
    path: "como mudanças climáticas afetam o cotidiano local de formas desiguais",
    question: "Como o clima global aparece no bairro, na escola e na rotina?",
  },
  espaço: {
    path: "como descobertas sobre o espaço mudam a forma de imaginar ciência e futuro",
    question: "Por que estudar o espaço diz tanto sobre a Terra e sobre nós mesmos?",
  },
  física: {
    path: "como a física aparece em movimentos, objetos, sons e fenômenos do dia a dia",
    question: "Onde a física aparece sem ter cara de aula de física?",
  },
  química: {
    path: "como química está presente em alimentos, cosméticos, limpeza e transformações cotidianas",
    question: "Que reações químicas já fazem parte da rotina sem chamar atenção?",
  },
  história: {
    path: "como o passado continua moldando desigualdades, costumes e decisões atuais",
    question: "O que parece assunto do passado, mas continua agindo no presente?",
  },
  sociologia: {
    path: "como relações sociais moldam comportamentos, expectativas e oportunidades",
    question: "Que regras invisíveis organizam a vida social sem ninguém combinar?",
  },
  identidade: {
    path: "como identidade é construída entre pertencimento, cultura, imagem e vivência",
    question: "O que faz alguém sentir que pertence a um grupo, lugar ou história?",
  },
  comportamento: {
    path: "como hábitos, pressão social e ambiente influenciam atitudes cotidianas",
    question: "Quanto do que a gente faz é escolha e quanto vem do ambiente ao redor?",
  },
  futuro: {
    path: "como jovens imaginam o futuro em meio a mudanças sociais, tecnológicas e ambientais",
    question: "O que mais influencia a forma como adolescentes imaginam o próprio futuro?",
  },
  mobilidade: {
    path: "como deslocamento e transporte interferem em tempo, acesso e qualidade de vida",
    question: "Quanto tempo da vida é gasto só para conseguir chegar aos lugares?",
  },
  "saúde mental": {
    path: "como pressões, rotina, relações e redes afetam a saúde mental dos adolescentes",
    question: "Quais situações pesam mais no emocional dos jovens hoje?",
  },
  tecnologia: {
    path: "como a tecnologia muda relações, hábitos, aprendizagem e visão de mundo",
    question: "Quando a tecnologia resolve problemas e quando cria outros novos?",
  },
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function generateThemeIdeaSuggestionsSimulated(
  input: GenerateThemeIdeaSuggestionsInput
): Promise<ThemeIdeaSuggestionResult> {
  const selectedTopics = uniqueStrings(
    input.selectedTopics.map((topic) => topic.trim().toLowerCase()).filter(Boolean)
  );

  if (selectedTopics.length === 0) {
    throw new Error("Selecione pelo menos um assunto para receber sugestões.");
  }

  const matchedConnections = TOPIC_CONNECTIONS.filter((connection) =>
    connection.topics.some((topic) => selectedTopics.includes(topic))
  );

  const possiblePaths = uniqueStrings(
    matchedConnections.map((connection) => connection.path).concat(
      selectedTopics
        .map((topic) => TOPIC_FALLBACKS[topic]?.path)
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 3);

  const conversationStarters = uniqueStrings(
    matchedConnections.map((connection) => connection.question).concat(
      selectedTopics
        .map((topic) => TOPIC_FALLBACKS[topic]?.question)
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 3);

  const readableTopics = selectedTopics.slice(0, 4).join(", ");
  const interestSummary =
    selectedTopics.length === 1
      ? `Pelo que apareceu, existe curiosidade sobre ${readableTopics}. Isso já é um ótimo começo para transformar interesse em investigação.`
      : `Pelas escolhas, o grupo parece se interessar por ${readableTopics}${selectedTopics.length > 4 ? " e outros assuntos" : ""}. Dá para cruzar essas áreas e chegar a recortes bem mais criativos do que o óbvio.`;

  return {
    interest_summary: interestSummary,
    possible_paths:
      possiblePaths.length > 0
        ? possiblePaths
        : [
            "como interesses do grupo podem se conectar com situações reais da escola, do bairro ou da comunidade",
            "como um assunto do cotidiano pode ganhar recorte social, científico ou cultural",
            "como curiosidades pessoais podem virar perguntas investigáveis e não só opiniões soltas",
          ],
    conversation_starters:
      conversationStarters.length > 0
        ? conversationStarters
        : [
            "Qual dessas curiosidades faz mais sentido para a realidade do grupo?",
            "Que assunto daria vontade de pesquisar por mais tempo sem cansar?",
            "Qual recorte pode transformar um interesse amplo em uma pergunta investigável?",
          ],
    model_name: "modo-simulado-local",
  };
}
