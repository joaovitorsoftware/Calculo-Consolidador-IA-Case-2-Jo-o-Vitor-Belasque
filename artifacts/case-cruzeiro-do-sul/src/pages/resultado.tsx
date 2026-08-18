import { ArrowRight, Check, CircleAlert, Compass, Lightbulb, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { getDiagnostic, type DiagnosticResponse } from '@/lib/api';

export default function Resultado() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const evaluationId = (() => {
    try {
      return JSON.parse(localStorage.getItem('consolida-evaluation') || '{}').evaluation_id as string;
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    if (!evaluationId) {
      setLoading(false);
      return;
    }
    getDiagnostic(evaluationId)
      .then(setDiagnostic)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar seu diagnóstico.'))
      .finally(() => setLoading(false));
  }, [evaluationId]);

  if (loading) {
    return <AppShell step={3}><ResultSkeleton /></AppShell>;
  }
  if (!diagnostic) {
    return <AppShell step={3}><div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-5 py-16"><div className="w-full rounded-3xl border border-border bg-card p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><CircleAlert size={25} /></div><h1 className="mt-5 font-serif text-3xl text-primary dark:text-foreground">Ainda não há um diagnóstico</h1><p className="mt-3 text-sm text-muted-foreground">{error || 'Conclua uma avaliação para visualizar sua devolutiva.'}</p><Link href="/" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" data-testid="link-restart-empty"><RotateCcw size={16} /> Iniciar avaliação</Link></div></div></AppShell>;
  }

  const score = Math.round(diagnostic.overall_score);
  return (
    <AppShell step={3}>
      <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-16">
        <div className="page-enter">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent-foreground dark:text-accent">Devolutiva da sua aula</p>
          <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div><h1 className="font-serif text-5xl tracking-tight text-primary dark:text-foreground sm:text-6xl">Você avançou, {diagnostic.student_name}<span className="text-accent">.</span></h1><p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">Aqui está um retrato do que já está firme e do ponto que merece mais uma conversa com a aula.</p></div>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3"><div className="grid size-11 place-items-center rounded-full bg-secondary text-primary dark:bg-primary/15 dark:text-accent"><TrendingUp size={21} /></div><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">Domínio geral</p><p className="font-serif text-2xl text-primary dark:text-foreground" data-testid="text-overall-score">{score}<span className="text-base text-muted-foreground">/100</span></p></div></div>
          </div>
        </div>

        <div className="page-enter delay-1 mt-10 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground sm:p-9">
            <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full border-[22px] border-accent/15" />
            <div className="relative">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-accent"><SparkIcon /> Leitura da tutora</div>
              <p className="mt-7 font-serif text-[25px] leading-[1.25] text-primary-foreground" data-testid="text-ai-message">“{diagnostic.ai_message}”</p>
              <div className="mt-8 flex items-center gap-2 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/65"><span className="size-2 rounded-full bg-accent" /> Um diagnóstico para orientar, nunca para rotular.</div>
            </div>
          </section>
          <section className="rounded-3xl border border-border bg-card p-7 sm:p-9">
            <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Mapa de domínio</p><h2 className="mt-2 font-serif text-2xl text-primary dark:text-foreground">Objetivos da aula</h2></div><Target className="text-accent" size={23} /></div>
            <div className="mt-8 space-y-5">
              {diagnostic.chart.map((item, index) => <div key={`${item.name}-${index}`} data-testid={`chart-objective-${index}`}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="truncate text-foreground/85">{item.name}</span><span className="font-mono text-xs text-muted-foreground">{Math.round(item.score)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`progress-fill h-full rounded-full ${item.score >= 70 ? 'bg-accent' : 'bg-amber-400'}`} style={{ width: `${Math.max(3, Math.min(item.score, 100))}%` }} /></div></div>)}
            </div>
          </section>
        </div>

        <div className="page-enter delay-2 mt-5 grid gap-5 lg:grid-cols-2">
          <ObjectivePanel title="O que já está ficando sólido" eyebrow="Pontos fortes" icon={<Check size={18} />} items={diagnostic.mastered_objectives} positive />
          <ObjectivePanel title="Onde vale voltar com calma" eyebrow="Para revisar" icon={<Lightbulb size={18} />} items={diagnostic.review_objectives} />
        </div>

        <section className="page-enter delay-3 mt-5 rounded-3xl border border-border bg-card p-7 sm:p-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent-foreground dark:text-accent">Seu próximo passo</p><h2 className="mt-2 font-serif text-3xl text-primary dark:text-foreground">Um plano pequeno, mas concreto.</h2></div><div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary dark:bg-primary/15 dark:text-accent"><Compass size={21} /></div></div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">{diagnostic.next_steps.map((step, index) => <div key={`${step}-${index}`} className="flex gap-3 rounded-2xl bg-muted/60 p-4" data-testid={`next-step-${index}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-accent-foreground">{index + 1}</span><p className="text-sm leading-relaxed text-foreground/80">{step}</p></div>)}</div>
        </section>

        <div className="mt-9 flex flex-col items-center justify-between gap-4 border-t border-border pt-7 sm:flex-row"><p className="text-sm text-muted-foreground">Quer experimentar outro ritmo de estudo?</p><Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:border-accent dark:text-foreground" data-testid="link-new-evaluation"><RotateCcw size={16} /> Fazer outra avaliação <ArrowRight size={16} /></Link></div>
      </div>
    </AppShell>
  );
}

function ObjectivePanel({ title, eyebrow, icon, items, positive = false }: { title: string; eyebrow: string; icon: ReactNode; items: { name: string; score: number; evidence: string; recommendation?: string }[]; positive?: boolean }) {
  return <section className="rounded-3xl border border-border bg-card p-7 sm:p-8"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground"><span className={positive ? 'text-accent-foreground dark:text-accent' : 'text-amber-600 dark:text-amber-300'}>{icon}</span>{eyebrow}</div><h2 className="mt-3 font-serif text-2xl text-primary dark:text-foreground">{title}</h2>{items.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Nenhum ponto para destacar nesta rodada.</p> : <div className="mt-6 space-y-4">{items.map((item, index) => <div key={`${item.name}-${index}`} className="border-t border-border pt-4" data-testid={`${positive ? 'mastered' : 'review'}-objective-${index}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-foreground">{item.name}</p><span className={`shrink-0 font-mono text-xs ${positive ? 'text-accent-foreground dark:text-accent' : 'text-amber-600 dark:text-amber-300'}`}>{Math.round(item.score)}%</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{positive ? item.evidence : item.recommendation}</p>{!positive && <p className="mt-2 border-l-2 border-amber-400/60 pl-3 text-xs italic leading-relaxed text-foreground/65">{item.evidence}</p>}</div>)}</div>}</section>;
}

function SparkIcon() {
  return <span className="inline-block size-2 rounded-full bg-accent" />;
}

function ResultSkeleton() {
  return <div className="mx-auto max-w-[1120px] animate-pulse px-5 py-16 sm:px-8"><div className="h-3 w-36 rounded bg-muted" /><div className="mt-6 h-16 max-w-2xl rounded bg-muted" /><div className="mt-4 h-5 max-w-xl rounded bg-muted" /><div className="mt-12 grid gap-5 lg:grid-cols-2"><div className="h-72 rounded-3xl bg-muted" /><div className="h-72 rounded-3xl bg-muted" /></div><div className="mt-5 h-64 rounded-3xl bg-muted" /></div>;
}