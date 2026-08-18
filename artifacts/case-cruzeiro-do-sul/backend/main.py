from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import fitz
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
PDF_PATH = ROOT / "data" / "aula_calculo.pdf"
DB_PATH = ROOT / "data" / "consolida_calculo.sqlite3"
PROMPT_PATH = ROOT / "prompts" / "diagnostic_prompt.md"
BASE_PATH = os.getenv("BASE_PATH", "/case-cruzeiro-do-sul-api").rstrip("/")
PORT = int(os.getenv("PORT", "8001"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

app = FastAPI(title="Consolida Cálculo I API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter(prefix=BASE_PATH)


class Question(BaseModel):
    id: str
    objective: str
    prompt: str
    options: list[str]


class StartEvaluationRequest(BaseModel):
    student_name: str = Field(min_length=2, max_length=120)
    mode: Literal["consolidation", "test"] = "consolidation"


class StartEvaluationResponse(BaseModel):
    evaluation_id: str
    student_name: str
    mode: str
    total_questions: int
    questions: list[Question]


class AnswerItem(BaseModel):
    question_id: str
    answer_index: int = Field(ge=0, le=5)


class SubmitAnswersRequest(BaseModel):
    answers: list[AnswerItem] = Field(min_length=1)


class SubmitAnswersResponse(BaseModel):
    evaluation_id: str
    student_name: str
    status: Literal["completed"]
    score: float
    correct_answers: int
    total_questions: int


class ObjectiveResult(BaseModel):
    name: str
    score: float
    evidence: str


class ReviewObjective(BaseModel):
    name: str
    score: float
    recommendation: str
    evidence: str


class DiagnosticResponse(BaseModel):
    evaluation_id: str
    student_name: str
    ai_message: str
    overall_score: float
    mastered_objectives: list[ObjectiveResult]
    review_objectives: list[ReviewObjective]
    chart: list[dict[str, float | str]]
    next_steps: list[str]


QUESTION_BANK: list[dict[str, Any]] = [
    {
        "id": "funcoes-01",
        "objective": "Funções e matemática básica",
        "prompt": "Se f(x) = 3x + 1, qual é o valor de f(2)?",
        "options": ["4", "5", "6", "7"],
        "answer_index": 1,
    },
    {
        "id": "limites-01",
        "objective": "Limites",
        "prompt": "Qual é o valor de lim x→2 (x² − 4) / (x − 2), após simplificar a expressão?",
        "options": ["0", "2", "4", "Não existe"],
        "answer_index": 2,
    },
    {
        "id": "lhopital-01",
        "objective": "Regra de L'Hôpital",
        "prompt": "Quando um limite apresenta uma indeterminação 0/0, qual procedimento a aula indica?",
        "options": [
            "Substituir o denominador por zero",
            "Derivar numerador e denominador separadamente",
            "Integrar apenas o numerador",
            "Multiplicar os dois termos por x",
        ],
        "answer_index": 1,
    },
    {
        "id": "derivadas-01",
        "objective": "Derivadas e taxa de variação",
        "prompt": "Qual é a derivada de f(x) = x³?",
        "options": ["x²", "2x", "3x²", "3x³"],
        "answer_index": 2,
    },
    {
        "id": "derivadas-02",
        "objective": "Derivadas e taxa de variação",
        "prompt": "Na interpretação geométrica, a derivada em um ponto representa:",
        "options": [
            "A área total sob a curva",
            "A inclinação da reta tangente",
            "O valor máximo da função",
            "A distância até a origem",
        ],
        "answer_index": 1,
    },
    {
        "id": "cadeia-01",
        "objective": "Regra da cadeia",
        "prompt": "Pela regra da cadeia, a derivada de (3x² + 1)⁵ é:",
        "options": [
            "5(3x² + 1)⁴",
            "30x(3x² + 1)⁴",
            "15x(3x² + 1)⁵",
            "3x² + 1",
        ],
        "answer_index": 1,
    },
    {
        "id": "aplicacoes-01",
        "objective": "Interpretação física",
        "prompt": "Na sequência posição → velocidade → aceleração, a aceleração é:",
        "options": [
            "A derivada da posição",
            "A integral da velocidade",
            "A derivada da velocidade",
            "O limite da posição",
        ],
        "answer_index": 2,
    },
    {
        "id": "engenharia-01",
        "objective": "Aplicações em engenharia",
        "prompt": "Por que integrais e cálculo multivariável aparecem como próximos passos importantes?",
        "options": [
            "Porque substituem toda a álgebra",
            "Porque são essenciais para mecânica e eletromagnetismo",
            "Porque servem apenas para decorar fórmulas",
            "Porque eliminam a necessidade de funções",
        ],
        "answer_index": 1,
    },
    {
        "id": "engenharia-02",
        "objective": "Aplicações em engenharia",
        "prompt": "Para dimensionar vigas e cargas, o cálculo ajuda principalmente a:",
        "options": [
            "Modelar variações, esforços e comportamento das estruturas",
            "Escolher a cor da estrutura",
            "Remover todas as hipóteses de projeto",
            "Calcular somente a massa do material",
        ],
        "answer_index": 0,
    },
    {
        "id": "raiz-polimero-01",
        "objective": "Modelagem e resolução de problemas",
        "prompt": "Ao buscar numericamente a raiz de uma equação que modela um polímero, qual ideia do cálculo pode orientar a aproximação?",
        "options": [
            "Usar a variação local dada pela derivada",
            "Ignorar a função e escolher um número qualquer",
            "Usar apenas uma tabela sem avaliar a função",
            "Trocar a equação por uma integral sem contexto",
        ],
        "answer_index": 0,
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db() -> None:
    with get_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                status TEXT NOT NULL,
                score REAL,
                created_at TEXT NOT NULL,
                completed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                evaluation_id TEXT NOT NULL,
                objective TEXT NOT NULL,
                prompt TEXT NOT NULL,
                options_json TEXT NOT NULL,
                answer_index INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS answers (
                id TEXT PRIMARY KEY,
                evaluation_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                answer_index INTEGER NOT NULL,
                is_correct INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS diagnostics (
                evaluation_id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def read_lesson_text() -> str:
    if not PDF_PATH.exists():
        raise RuntimeError(f"Material da aula não encontrado em {PDF_PATH}")
    document = fitz.open(PDF_PATH)
    return "\n".join(page.get_text() for page in document)


def retrieve_context(query: str, max_chars: int = 9000) -> str:
    text = read_lesson_text()
    paragraphs = [part.strip() for part in re.split(r"\n{2,}", text) if part.strip()]
    tokens = {token.lower() for token in re.findall(r"[a-záéíóúãõç]{4,}", query)}
    ranked = sorted(
        paragraphs,
        key=lambda paragraph: sum(token in paragraph.lower() for token in tokens),
        reverse=True,
    )
    context = "\n\n".join(ranked[:8])
    return context[:max_chars]


def call_gemini(prompt: str) -> dict[str, Any] | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    try:
        with httpx.Client(timeout=35.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            body = response.json()
        raw_text = body["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_text)
    except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        return None


def question_set(mode: str) -> list[dict[str, Any]]:
    amount = 10 if mode == "test" else 6
    query = " ".join(item["objective"] for item in QUESTION_BANK)
    context = retrieve_context(query)
    prompt = f"""
Você é um tutor de Cálculo I para a Cruzeiro do Sul Virtual.
Crie exatamente {amount} questões objetivas simples, em português brasileiro,
somente a partir do contexto da aula abaixo. Inclua pelo menos uma questão
sobre funções, limites, derivadas, regra da cadeia e aplicações em engenharia.
Para cada questão, retorne id, objective, prompt, options (quatro alternativas)
e answer_index (índice inteiro da alternativa correta). Não invente conceitos
que não estejam sustentados pelo contexto; quando o pedido do aluno mencionar
polímeros, relacione apenas à modelagem e ao uso da derivada como variação local.
Retorne JSON no formato {{"questions": [...]}}.

CONTEXTO DA AULA:
{context}
"""
    generated = call_gemini(prompt)
    if generated and isinstance(generated.get("questions"), list):
        valid_questions = []
        for item in generated["questions"][:amount]:
            if (
                isinstance(item, dict)
                and item.get("prompt")
                and isinstance(item.get("options"), list)
                and len(item["options"]) >= 2
                and isinstance(item.get("answer_index"), int)
                and 0 <= item["answer_index"] < len(item["options"])
            ):
                valid_questions.append(
                    {
                        "id": str(item.get("id") or f"ia-{uuid.uuid4().hex[:8]}"),
                        "objective": str(item.get("objective") or "Consolidação de Cálculo I"),
                        "prompt": str(item["prompt"]),
                        "options": [str(option) for option in item["options"]],
                        "answer_index": item["answer_index"],
                    }
                )
        if len(valid_questions) >= 4:
            return valid_questions
    return QUESTION_BANK[:amount]


def public_question(item: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": item["id"],
        "objective": item["objective"],
        "prompt": item["prompt"],
        "options": json.loads(item["options_json"]),
    }


def diagnostic_from_scores(
    student_name: str, evaluation_id: str, questions: list[sqlite3.Row], answers: list[sqlite3.Row]
) -> dict[str, Any]:
    by_objective: dict[str, list[bool]] = {}
    for question in questions:
        matching = next((answer for answer in answers if answer["question_id"] == question["id"]), None)
        by_objective.setdefault(question["objective"], []).append(bool(matching and matching["is_correct"]))
    mastered: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []
    chart: list[dict[str, Any]] = []
    for objective, results in by_objective.items():
        score = round(sum(results) / len(results) * 100)
        chart.append({"name": objective, "score": score})
        if score >= 70:
            mastered.append(
                {
                    "name": objective,
                    "score": score,
                    "evidence": "Você acertou a maior parte das questões deste objetivo.",
                }
            )
        else:
            review.append(
                {
                    "name": objective,
                    "score": score,
                    "evidence": "As respostas mostram que este objetivo ainda precisa de prática.",
                    "recommendation": f"Revise a seção sobre {objective.lower()} e refaça um exemplo passo a passo.",
                }
            )
    overall = round(sum(item["score"] for item in chart) / max(len(chart), 1))
    return {
        "evaluation_id": evaluation_id,
        "student_name": student_name,
        "ai_message": f"{student_name}, você concluiu sua consolidação de Cálculo I. Seu próximo passo está destacado abaixo para estudar com mais segurança.",
        "overall_score": overall,
        "mastered_objectives": mastered,
        "review_objectives": review,
        "chart": chart,
        "next_steps": [
            "Revise primeiro o objetivo com menor pontuação.",
            "Explique em voz alta a regra usada em cada exercício.",
            "Faça uma nova consolidação depois da revisão.",
        ],
    }


def build_diagnostic(
    student_name: str,
    evaluation_id: str,
    questions: list[sqlite3.Row],
    answers: list[sqlite3.Row],
) -> dict[str, Any]:
    base = diagnostic_from_scores(student_name, evaluation_id, questions, answers)
    summary = "\n".join(
        f"- {question['objective']}: {'acerto' if next((a for a in answers if a['question_id'] == question['id']), None)['is_correct'] else 'revisar'}"
        for question in questions
    )
    prompt_template = PROMPT_PATH.read_text(encoding="utf-8") if PROMPT_PATH.exists() else ""
    context = retrieve_context("diagnóstico objetivos funções limites derivadas regra da cadeia engenharia")
    generated = call_gemini(
        f"""{prompt_template}

Nome do aluno: {student_name}
ID da avaliação: {evaluation_id}
Resumo das respostas:
{summary}

Contexto recuperado do PDF:
{context}

Retorne apenas JSON válido seguindo este formato:
{json.dumps({key: base[key] for key in base}, ensure_ascii=False)}
"""
    )
    if generated and all(key in generated for key in base):
        generated["evaluation_id"] = evaluation_id
        generated["student_name"] = student_name
        if student_name not in generated["ai_message"]:
            generated["ai_message"] = f"{student_name}, {generated['ai_message']}"
        return generated
    return base


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "consolida-calculo-api"}


@router.post("/evaluations/start", response_model=StartEvaluationResponse)
def start_evaluation(payload: StartEvaluationRequest) -> StartEvaluationResponse:
    student_id = uuid.uuid4().hex
    evaluation_id = uuid.uuid4().hex
    questions = question_set(payload.mode)
    now = utc_now()
    with get_db() as connection:
        connection.execute(
            "INSERT INTO students (id, name, created_at) VALUES (?, ?, ?)",
            (student_id, payload.student_name.strip(), now),
        )
        connection.execute(
            "INSERT INTO evaluations (id, student_id, mode, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (evaluation_id, student_id, payload.mode, "in_progress", now),
        )
        connection.executemany(
            "INSERT INTO questions (id, evaluation_id, objective, prompt, options_json, answer_index) VALUES (?, ?, ?, ?, ?, ?)",
            [
                (
                    f"{evaluation_id}-{item['id']}",
                    evaluation_id,
                    item["objective"],
                    item["prompt"],
                    json.dumps(item["options"], ensure_ascii=False),
                    item["answer_index"],
                )
                for item in questions
            ],
        )
    with get_db() as connection:
        stored_questions = connection.execute(
            "SELECT * FROM questions WHERE evaluation_id = ? ORDER BY rowid",
            (evaluation_id,),
        ).fetchall()
    return StartEvaluationResponse(
        evaluation_id=evaluation_id,
        student_name=payload.student_name.strip(),
        mode=payload.mode,
        total_questions=len(stored_questions),
        questions=[Question(**public_question(item)) for item in stored_questions],
    )


@router.post("/evaluations/{evaluation_id}/answers", response_model=SubmitAnswersResponse)
def submit_answers(evaluation_id: str, payload: SubmitAnswersRequest) -> SubmitAnswersResponse:
    with get_db() as connection:
        evaluation = connection.execute(
            """
            SELECT evaluations.id, evaluations.student_id, students.name
            FROM evaluations JOIN students ON students.id = evaluations.student_id
            WHERE evaluations.id = ?
            """,
            (evaluation_id,),
        ).fetchone()
        if not evaluation:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
        questions = connection.execute(
            "SELECT * FROM questions WHERE evaluation_id = ? ORDER BY rowid",
            (evaluation_id,),
        ).fetchall()
        question_map = {question["id"]: question for question in questions}
        if set(answer.question_id for answer in payload.answers) != set(question_map):
            raise HTTPException(status_code=400, detail="Envie uma resposta para cada questão.")
        connection.execute("DELETE FROM answers WHERE evaluation_id = ?", (evaluation_id,))
        rows = []
        correct = 0
        now = utc_now()
        for answer in payload.answers:
            question = question_map[answer.question_id]
            is_correct = int(answer.answer_index == question["answer_index"])
            correct += is_correct
            rows.append(
                (
                    uuid.uuid4().hex,
                    evaluation_id,
                    answer.question_id,
                    answer.answer_index,
                    is_correct,
                    now,
                )
            )
        connection.executemany(
            "INSERT INTO answers (id, evaluation_id, question_id, answer_index, is_correct, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            rows,
        )
        score = round(correct / len(questions) * 100, 1)
        connection.execute(
            "UPDATE evaluations SET status = ?, score = ?, completed_at = ? WHERE id = ?",
            ("completed", score, now, evaluation_id),
        )
    return SubmitAnswersResponse(
        evaluation_id=evaluation_id,
        student_name=evaluation["name"],
        status="completed",
        score=score,
        correct_answers=correct,
        total_questions=len(questions),
    )


@router.get("/evaluations/{evaluation_id}/diagnostic", response_model=DiagnosticResponse)
def get_diagnostic(evaluation_id: str) -> DiagnosticResponse:
    with get_db() as connection:
        evaluation = connection.execute(
            """
            SELECT evaluations.id, students.name, evaluations.status
            FROM evaluations JOIN students ON students.id = evaluations.student_id
            WHERE evaluations.id = ?
            """,
            (evaluation_id,),
        ).fetchone()
        if not evaluation:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
        if evaluation["status"] != "completed":
            raise HTTPException(status_code=409, detail="Conclua a avaliação antes de ver o diagnóstico.")
        saved = connection.execute(
            "SELECT payload_json FROM diagnostics WHERE evaluation_id = ?",
            (evaluation_id,),
        ).fetchone()
        if saved:
            return DiagnosticResponse(**json.loads(saved["payload_json"]))
        questions = connection.execute(
            "SELECT * FROM questions WHERE evaluation_id = ? ORDER BY rowid",
            (evaluation_id,),
        ).fetchall()
        answers = connection.execute(
            "SELECT * FROM answers WHERE evaluation_id = ? ORDER BY rowid",
            (evaluation_id,),
        ).fetchall()
    diagnostic = build_diagnostic(evaluation["name"], evaluation_id, questions, answers)
    with get_db() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO diagnostics (evaluation_id, payload_json, created_at) VALUES (?, ?, ?)",
            (evaluation_id, json.dumps(diagnostic, ensure_ascii=False), utc_now()),
        )
    return DiagnosticResponse(**diagnostic)


app.include_router(router)
initialize_db()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=PORT, reload=False)