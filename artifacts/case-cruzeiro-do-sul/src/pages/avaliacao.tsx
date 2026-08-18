import { ArrowLeft, ArrowRight, Check, CircleHelp, LoaderCircle, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { submitAnswers, type Question, type StartEvaluationResponse } from '@/lib/api';

export default function Avaliacao() {
  const [, setLocation] = useLocation();
  const [evaluation, setEvaluation] = useState<StartEvaluationResponse | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('consolida-evaluation');
      if (stored) setEvaluation(JSON.parse(stored) as StartEvaluationResponse);
      const storedAnswers = localStorage.getItem('consolida-answers');
      if (storedAnswers) setAnswers(JSON.parse(storedAnswers) as Record<string, number>);
    } catch {
      setError('A sessão ficou incompleta. Comece uma nova consolidação.');
    }
  }, []);

  const question = evaluation?.questions[current];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = evaluation ? ((current + (selected !== null ? 1 : 0)) / evaluation.total_questions) * 100 : 0;

  function chooseAnswer(index: number) {
    if (!question || submitting) return;
    setSelected(index);
    const nextAnswers = { ...answers, [question.id]: index };
    setAnswers(nextAnswers);
    localStorage.setItem('consolida-answers', JSON.stringify(nextAnswers));
    setError('');
  }

  async function continueQuestion() {
    if (!evaluation || !question || selected === null) return;
    if (current < evaluation.questions.length - 1) {
      setCurrent((value) => value + 1);
      const nextQuestion = evaluation.questions[current + 1];
      setSelected(answers[nextQuestion.id] ?? null);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = evaluation.questions.map((item) => ({
        question_id: item.id,
        answer_index: answers[item.id] ?? (item.id === question.id ? selected : -1),
      }));
      await submitAnswers(evaluation.evaluation_id, payload);
      localStorage.setItem('consolida-finished', 'true');
      setLocation('/resultado');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar suas respostas.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!evaluation) {
    return (
      <AppShell step={2}>
        <div className="mx-auto flex min-h-[62vh] max-w-xl items-center justify-center px-5 py-16">
          <div className="page-enter w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary dark:bg-primary/15 dark:text-accent"><CircleHelp size={25} /></div>
            <h1 className="mt-6 font-serif text-3xl text-primary dark:text-foreground">Sua sessão ainda não começou</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{error || 'Volte para a entrada e escolha como quer revisar a aula.'}</p>
            <Link href="/" className="focus-ring mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" data-testid="link-back-home-empty"><ArrowLeft size={16} /> Voltar ao início</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell step={2}>
      <div className="mx-auto max-w-[960px] px-5 py-10 sm:px-8 sm:py-16">
        <div className="page-enter">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.17em] text-accent-foreground dark:text-accent">Consolidação em andamento</p>
              <h1 className="mt-3 font-serif text-4xl tracking-tight text-primary dark:text-foreground sm:text-5xl">Vamos pensar juntos<span className="text-accent">.</span></h1>
            </div>
            <div className="hidden text-right sm:block"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Respondidas</p><p className="mt-1 font-serif text-2xl text-primary dark:text-foreground">{answeredCount}<span className="text-muted-foreground">/{evaluation.total_questions}</span></p></div>
          </div>
          <div className="mt-9 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="progress-fill h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(progress, 5)}%` }} /></div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground"><span>Questão {String(current + 1).padStart(2, '0')}</span><span>{Math.round(progress)}% do caminho</span></div>
        </div>

        <div className="page-enter delay-1 mt-10 grid gap-8 lg:grid-cols-[.28fr_1fr]">
          <div className="hidden lg:block">
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Objetivo da vez</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-primary dark:text-foreground">{question?.objective}</p>
            <div className="mt-8 border-l-2 border-accent/50 pl-4 text-xs leading-relaxed text-muted-foreground">Não precisa correr. Leia, rascunhe se quiser e escolha a alternativa que melhor representa seu raciocínio.</div>
          </div>
          <QuestionCard question={question} selected={selected} onSelect={chooseAnswer} />
        </div>

        <div className="page-enter delay-2 mt-8 lg:ml-[28%]">
          {selected !== null && <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-primary dark:text-foreground" data-testid="status-answer-selected"><span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground"><Check size={14} strokeWidth={3} /></span><span>Resposta registrada. Quando estiver pronto, avance.</span></div>}
          {error && <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" data-testid="status-answer-error">{error}</div>}
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => current > 0 && (setCurrent((value) => value - 1), setSelected(answers[evaluation.questions[current - 1].id] ?? null))} disabled={current === 0 || submitting} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30" data-testid="button-previous-question"><ArrowLeft size={16} /> Anterior</button>
            <button type="button" onClick={continueQuestion} disabled={selected === null || submitting} className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-next-question">
              {submitting ? <><LoaderCircle size={17} className="animate-spin" /> Enviando...</> : current === evaluation.questions.length - 1 ? <>Ver meu diagnóstico <ArrowRight size={17} /></> : <>Próxima pergunta <ArrowRight size={17} /></>}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function QuestionCard({ question, selected, onSelect }: { question?: Question; selected: number | null; onSelect: (index: number) => void }) {
  if (!question) return <div className="h-80 animate-pulse rounded-3xl bg-muted" />;
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-[0_18px_50px_hsl(222_48%_17%/.07)] sm:p-9" aria-labelledby="question-prompt">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-3 py-1 font-mono text-[10px] uppercase tracking-[.1em] text-primary dark:bg-primary/15 dark:text-accent">Objetivo em foco</span>
        <span className="text-xs text-muted-foreground lg:hidden">{question.objective}</span>
      </div>
      <h2 id="question-prompt" className="mt-7 max-w-2xl font-serif text-[clamp(1.7rem,3vw,2.45rem)] leading-tight text-primary dark:text-foreground">{question.prompt}</h2>
      <div className="mt-8 space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selected === index;
          return <button type="button" key={`${question.id}-${index}`} onClick={() => onSelect(index)} className={`focus-ring group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${isSelected ? 'border-accent bg-accent/10 shadow-[0_4px_14px_hsl(184_73%_51%/.12)]' : 'border-border hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40'}`} data-testid={`button-option-${index}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-xs transition ${isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-background text-muted-foreground group-hover:border-primary/30'}`}>{String.fromCharCode(65 + index)}</span>
            <span className={`pt-1 text-sm leading-relaxed ${isSelected ? 'font-medium text-primary dark:text-foreground' : 'text-foreground/80'}`}>{option}</span>
          </button>;
        })}
      </div>
    </section>
  );
}