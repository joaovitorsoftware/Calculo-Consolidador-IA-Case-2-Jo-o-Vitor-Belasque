import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";

type Mode = "consolidation" | "test";

type Question = {
  id: string;
  objective: string;
  prompt: string;
  options: string[];
  answerIndex: number;
};

type Evaluation = {
  id: string;
  studentName: string;
  mode: Mode;
  questions: Question[];
  answers?: Record<string, number>;
  score?: number;
  diagnostic?: Diagnostic;
};

type Objective = {
  name: string;
  score: number;
  evidence: string;
};

type ReviewObjective = Objective & {
  recommendation: string;
};

type Diagnostic = {
  evaluation_id: string;
  student_name: string;
  ai_message: string;
  overall_score: number;
  mastered_objectives: Objective[];
  review_objectives: ReviewObjective[];
  chart: Array<{ name: string; score: number }>;
  next_steps: string[];
};

const router: IRouter = Router();
const evaluations = new Map<string, Evaluation>();

const contextCandidates = [
  path.resolve(
    process.cwd(),
    "artifacts/case-cruzeiro-do-sul/data/aula_calculo_context.txt",
  ),
  path.resolve(
    process.cwd(),
    "../case-cruzeiro-do-sul/data/aula_calculo_context.txt",
  ),
];
const lessonContext =
  contextCandidates
    .map((candidate) => (fs.existsSync(candidate) ? fs.readFileSync(candidate, "utf8") : ""))
    .find(Boolean) ??
  "Aula de Cálculo I: funções, limites, regra de L'Hôpital, derivadas, regra da cadeia, interpretação física e aplicações em engenharia.";

const questionBank: Question[] = [
  {
    id: "funcoes-01",
    objective: "Funções e matemática básica",
    prompt: "Se f(x) = 3x + 1, qual é o valor de f(2)?",
    options: ["4", "5", "6", "7"],
    answerIndex: 1,
  },
  {
    id: "limites-01",
    objective: "Limites",
    prompt: "Qual é o valor de lim x→2 (x² − 4) / (x − 2), após simplificar a expressão?",
    options: ["0", "2", "4", "Não existe"],
    answerIndex: 2,
  },
  {
    id: "lhopital-01",
    objective: "Regra de L'Hôpital",
    prompt: "Quando um limite apresenta uma indeterminação 0/0, qual procedimento a aula indica?",
    options: [
      "Substituir o denominador por zero",
      "Derivar numerador e denominador separadamente",
      "Integrar apenas o numerador",
      "Multiplicar os dois termos por x",
    ],
    answerIndex: 1,
  },
  {
    id: "derivadas-01",
    objective: "Derivadas e taxa de variação",
    prompt: "Qual é a derivada de f(x) = x³?",
    options: ["x²", "2x", "3x²", "3x³"],
    answerIndex: 2,
  },
  {
    id: "derivadas-02",
    objective: "Derivadas e taxa de variação",
    prompt: "Na interpretação geométrica, a derivada em um ponto representa:",
    options: [
      "A área total sob a curva",
      "A inclinação da reta tangente",
      "O valor máximo da função",
      "A distância até a origem",
    ],
    answerIndex: 1,
  },
  {
    id: "cadeia-01",
    objective: "Regra da cadeia",
    prompt: "Pela regra da cadeia, a derivada de (3x² + 1)⁵ é:",
    options: [
      "5(3x² + 1)⁴",
      "30x(3x² + 1)⁴",
      "15x(3x² + 1)⁵",
      "3x² + 1",
    ],
    answerIndex: 1,
  },
  {
    id: "aplicacoes-01",
    objective: "Interpretação física",
    prompt: "Na sequência posição → velocidade → aceleração, a aceleração é:",
    options: [
      "A derivada da posição",
      "A integral da velocidade",
      "A derivada da velocidade",
      "O limite da posição",
    ],
    answerIndex: 2,
  },
  {
    id: "engenharia-01",
    objective: "Aplicações em engenharia",
    prompt: "Por que integrais e cálculo multivariável aparecem como próximos passos importantes?",
    options: [
      "Porque substituem toda a álgebra",
      "Porque são essenciais para mecânica e eletromagnetismo",
      "Porque servem apenas para decorar fórmulas",
      "Porque eliminam a necessidade de funções",
    ],
    answerIndex: 1,
  },
  {
    id: "engenharia-02",
    objective: "Aplicações em engenharia",
    prompt: "Para dimensionar vigas e cargas, o cálculo ajuda principalmente a:",
    options: [
      "Modelar variações, esforços e comportamento das estruturas",
      "Escolher a cor da estrutura",
      "Remover todas as hipóteses de projeto",
      "Calcular somente a massa do material",
    ],
    answerIndex: 0,
  },
  {
    id: "raiz-polimero-01",
    objective: "Modelagem e resolução de problemas",
    prompt: "Ao buscar numericamente a raiz de uma equação que modela um polímero, qual ideia do cálculo pode orientar a aproximação?",
    options: [
      "Usar a variação local dada pela derivada",
      "Ignorar a função e escolher um número qualquer",
      "Usar apenas uma tabela sem avaliar a função",
      "Trocar a equação por uma integral sem contexto",
    ],
    answerIndex: 0,
  },
];

function publicQuestion(question: Question) {
  return {
    id: question.id,
    objective: question.objective,
    prompt: question.prompt,
    options: question.options,
  };
}

function buildLocalDiagnostic(evaluation: Evaluation): Diagnostic {
  const byObjective = new Map<string, boolean[]>();
  for (const question of evaluation.questions) {
    const values = byObjective.get(question.objective) ?? [];
    values.push(evaluation.answers?.[question.id] === question.answerIndex);
    byObjective.set(question.objective, values);
  }

  const chart = [...byObjective.entries()].map(([name, values]) => ({
    name,
    score: Math.round(
      (values.filter(Boolean).length / Math.max(values.length, 1)) * 100,
    ),
  }));
  const masteredObjectives = chart
    .filter((item) => item.score >= 70)
    .map((item) => ({
      ...item,
      evidence: "Você acertou a maior parte das questões deste objetivo.",
    }));
  const reviewObjectives = chart
    .filter((item) => item.score < 70)
    .map((item) => ({
      ...item,
      evidence: "As respostas indicam que este objetivo ainda precisa de prática.",
      recommendation: `Revise a seção sobre ${item.name.toLowerCase()} e refaça um exemplo passo a passo.`,
    }));

  return {
    evaluation_id: evaluation.id,
    student_name: evaluation.studentName,
    ai_message: `${evaluation.studentName}, você concluiu sua consolidação de Cálculo I. Seu próximo passo está destacado abaixo para estudar com mais segurança.`,
    overall_score: Math.round(
      chart.reduce((sum, item) => sum + item.score, 0) /
        Math.max(chart.length, 1),
    ),
    mastered_objectives: masteredObjectives,
    review_objectives: reviewObjectives,
    chart,
    next_steps: [
      "Revise primeiro o objetivo com menor pontuação.",
      "Explique em voz alta a regra usada em cada exercício.",
      "Faça uma nova consolidação depois da revisão.",
    ],
  };
}

async function askGemini(evaluation: Evaluation): Promise<Diagnostic | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const local = buildLocalDiagnostic(evaluation);
  const answerSummary = evaluation.questions
    .map((question) => {
      const chosen = evaluation.answers?.[question.id];
      return `${question.objective}: ${
        chosen === question.answerIndex ? "acerto" : "revisar"
      }`;
    })
    .join("\n");
  const prompt = `Você é uma tutora de Cálculo I da Cruzeiro do Sul Virtual.
Analise as respostas usando apenas o contexto abaixo. Responda somente JSON
válido com as chaves evaluation_id, student_name, ai_message,
overall_score, mastered_objectives, review_objectives, chart e next_steps.
Use o nome do aluno na mensagem principal. Considere domínio >= 70%.
Cada item de review_objectives precisa ter name, score, evidence e
recommendation. Cada item de mastered_objectives precisa ter name, score e
evidence. Não invente conteúdos fora do material.

Nome do aluno: ${evaluation.studentName}
ID: ${evaluation.id}
Resumo:
${answerSummary}

Contexto recuperado do PDF:
${lessonContext}

Formato de referência:
${JSON.stringify(local)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const generated = JSON.parse(raw) as Diagnostic;
    if (
      typeof generated.ai_message !== "string" ||
      !Array.isArray(generated.chart) ||
      !Array.isArray(generated.review_objectives)
    ) {
      return null;
    }
    const aiMessage = generated.ai_message.includes(evaluation.studentName)
      ? generated.ai_message
      : `${evaluation.studentName}, ${generated.ai_message}`;
    return {
      ...generated,
      ai_message: aiMessage,
      evaluation_id: evaluation.id,
      student_name: evaluation.studentName,
    };
  } catch {
    return null;
  }
}

async function askGeminiQuestions(mode: Mode): Promise<Question[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const amount = mode === "test" ? 10 : 6;
  const prompt = `Você é uma tutora de Cálculo I da Cruzeiro do Sul Virtual.
Crie exatamente ${amount} perguntas objetivas simples, em português brasileiro,
baseadas somente no contexto abaixo. Cubra funções, limites, L'Hôpital,
derivadas, regra da cadeia, integrais e multivariáveis como próximos passos,
modelagem de raízes e dimensionamento de vigas. Para polímeros, relacione a
ideia à variação local dada pela derivada, sem inventar conteúdo avançado.
Retorne apenas JSON com {"questions":[{"id":string,"objective":string,
"prompt":string,"options":[string,string,string,string],"answer_index":number}]}.

CONTEXTO:
${lessonContext}`;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      questions?: Array<{
        id?: string;
        objective?: string;
        prompt?: string;
        options?: string[];
        answer_index?: number;
      }>;
    };
    const generated = (parsed.questions ?? [])
      .slice(0, amount)
      .filter(
        (question) =>
          typeof question.prompt === "string" &&
          typeof question.objective === "string" &&
          Array.isArray(question.options) &&
          question.options.length === 4 &&
          typeof question.answer_index === "number" &&
          question.answer_index >= 0 &&
          question.answer_index < 4,
      )
      .map((question, index) => ({
        id: question.id || `ia-${mode}-${index + 1}`,
        objective: question.objective as string,
        prompt: question.prompt as string,
        options: question.options as string[],
        answerIndex: question.answer_index as number,
      }));
    return generated.length >= 4 ? generated : null;
  } catch {
    return null;
  }
}

router.post("/evaluations/start", async (req, res) => {
  const studentName =
    typeof req.body?.student_name === "string"
      ? req.body.student_name.trim()
      : "";
  const mode: Mode =
    req.body?.mode === "test" ? "test" : "consolidation";
  if (studentName.length < 2) {
    res.status(400).json({ error: "Informe seu nome para começar." });
    return;
  }

  const generatedQuestions = await askGeminiQuestions(mode);
  const evaluation: Evaluation = {
    id: crypto.randomUUID(),
    studentName,
    mode,
    questions:
      generatedQuestions ??
      (mode === "test" ? questionBank : questionBank.slice(0, 6)),
  };
  evaluations.set(evaluation.id, evaluation);
  res.json({
    evaluation_id: evaluation.id,
    student_name: evaluation.studentName,
    mode: evaluation.mode,
    total_questions: evaluation.questions.length,
    questions: evaluation.questions.map(publicQuestion),
  });
});

router.post("/evaluations/:evaluationId/answers", (req, res) => {
  const evaluation = evaluations.get(req.params.evaluationId);
  if (!evaluation) {
    res.status(404).json({ error: "Avaliação não encontrada." });
    return;
  }
  const answers = req.body?.answers;
  if (
    !Array.isArray(answers) ||
    answers.length !== evaluation.questions.length
  ) {
    res.status(400).json({ error: "Envie uma resposta para cada questão." });
    return;
  }
  const answerMap: Record<string, number> = {};
  for (const item of answers) {
    if (
      typeof item?.question_id !== "string" ||
      typeof item?.answer_index !== "number"
    ) {
      res.status(400).json({ error: "Formato de resposta inválido." });
      return;
    }
    answerMap[item.question_id] = item.answer_index;
  }
  const questionIds = new Set(evaluation.questions.map((question) => question.id));
  if (
    Object.keys(answerMap).length !== questionIds.size ||
    !Object.keys(answerMap).every((id) => questionIds.has(id))
  ) {
    res.status(400).json({ error: "Respostas incompletas." });
    return;
  }

  const correctAnswers = evaluation.questions.filter(
    (question) => answerMap[question.id] === question.answerIndex,
  ).length;
  evaluation.answers = answerMap;
  evaluation.score = Math.round(
    (correctAnswers / evaluation.questions.length) * 100,
  );
  res.json({
    evaluation_id: evaluation.id,
    student_name: evaluation.studentName,
    status: "completed",
    score: evaluation.score,
    correct_answers: correctAnswers,
    total_questions: evaluation.questions.length,
  });
});

router.get("/evaluations/:evaluationId/diagnostic", async (req, res) => {
  const evaluation = evaluations.get(req.params.evaluationId);
  if (!evaluation) {
    res.status(404).json({ error: "Avaliação não encontrada." });
    return;
  }
  if (!evaluation.answers) {
    res.status(409).json({ error: "Conclua a avaliação antes do diagnóstico." });
    return;
  }
  if (!evaluation.diagnostic) {
    evaluation.diagnostic =
      (await askGemini(evaluation)) ?? buildLocalDiagnostic(evaluation);
  }
  res.json(evaluation.diagnostic);
});

export default router;