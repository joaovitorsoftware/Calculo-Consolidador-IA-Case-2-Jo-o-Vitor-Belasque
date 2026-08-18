export type EvaluationMode = 'consolidation' | 'test';

export type Question = {
  id: string;
  objective: string;
  prompt: string;
  options: string[];
};

export type StartEvaluationResponse = {
  evaluation_id: string;
  student_name: string;
  mode: string;
  total_questions: number;
  questions: Question[];
};

export type SubmitAnswersResponse = {
  evaluation_id: string;
  student_name: string;
  status: 'completed';
  score: number;
  correct_answers: number;
  total_questions: number;
};

export type DiagnosticResponse = {
  evaluation_id: string;
  student_name: string;
  ai_message: string;
  overall_score: number;
  mastered_objectives: { name: string; score: number; evidence: string }[];
  review_objectives: { name: string; score: number; recommendation: string; evidence: string }[];
  chart: { name: string; score: number }[];
  next_steps: string[];
};

const API_PREFIX = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!response.ok) {
    let detail = 'Não foi possível concluir esta etapa.';
    try {
      const body = await response.json();
      detail = body.detail || body.message || detail;
    } catch {
      // A mensagem padrão já é acolhedora o suficiente para respostas sem corpo.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export function startEvaluation(studentName: string, mode: EvaluationMode) {
  return request<StartEvaluationResponse>('/evaluations/start', {
    method: 'POST',
    body: JSON.stringify({ student_name: studentName, mode }),
  });
}

export function submitAnswers(evaluationId: string, answers: { question_id: string; answer_index: number }[]) {
  return request<SubmitAnswersResponse>(`/evaluations/${evaluationId}/answers`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function getDiagnostic(evaluationId: string) {
  return request<DiagnosticResponse>(`/evaluations/${evaluationId}/diagnostic`);
}