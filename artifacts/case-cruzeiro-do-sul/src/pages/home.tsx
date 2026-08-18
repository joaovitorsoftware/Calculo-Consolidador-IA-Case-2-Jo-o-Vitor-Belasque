import { ArrowRight, BrainCircuit, Check, FileText, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { startEvaluation, type EvaluationMode } from '@/lib/api';

export default function Home() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<EvaluationMode>('consolidation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Digite seu nome para começarmos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const evaluation = await startEvaluation(name.trim(), mode);
      localStorage.setItem('consolida-student', evaluation.student_name);
      localStorage.setItem('consolida-evaluation', JSON.stringify(evaluation));
      localStorage.removeItem('consolida-answers');
      setLocation('/avaliacao');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="paper-grid relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute -right-24 top-10 size-80 rounded-full border-[38px] border-accent/10 sm:size-[470px]" />
        <div className="pointer-events-none absolute -right-10 top-24 size-60 rounded-full border border-primary/10 sm:size-[350px]" />
        <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-20 lg:py-28">
          <div className="page-enter relative">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-primary">
              <span className="size-1.5 rounded-full bg-accent soft-pulse" />
              Pós-aula · Cálculo I
            </div>
            <h1 className="max-w-[720px] font-serif text-[clamp(3.2rem,7vw,6.8rem)] leading-[.94] tracking-[-.045em] text-primary dark:text-foreground">
              A aula não termina quando o vídeo acaba<span className="text-accent">.</span>
            </h1>
            <p className="mt-8 max-w-[520px] text-[17px] leading-relaxed text-muted-foreground">
              Consolide o que você acabou de estudar com uma tutora que respeita seu ritmo — e transforma cada dúvida em um próximo passo possível.
            </p>
            <div className="mt-10 flex items-center gap-4 text-[12px] text-muted-foreground">
              <div className="flex -space-x-2">
                {['A', 'M', 'L'].map((letter) => <span key={letter} className="grid size-8 place-items-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground">{letter}</span>)}
              </div>
              <span>Feito para estudar depois da aula, sem pressão.</span>
            </div>
          </div>

          <div className="page-enter delay-2 relative">
            <form onSubmit={handleStart} className="rounded-[26px] border border-border bg-card p-6 shadow-[0_22px_60px_hsl(222_48%_17%/.10)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent-foreground dark:text-accent">Vamos começar</p>
                  <h2 className="mt-2 font-serif text-3xl text-primary dark:text-foreground">Como posso te chamar?</h2>
                </div>
                <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary dark:bg-primary/15 dark:text-accent">
                  <MessageCircle size={21} />
                </div>
              </div>
              <label className="mt-8 block text-sm font-medium text-foreground" htmlFor="student-name">Seu nome</label>
              <input
                id="student-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Digite seu nome completo"
                className="focus-ring mt-2 h-13 w-full rounded-xl border border-input bg-background px-4 text-[15px] outline-none transition placeholder:text-muted-foreground/65 focus:border-accent"
                data-testid="input-student-name"
              />
              <p className="mt-2 text-xs text-muted-foreground">Vou usar seu nome para deixar a devolutiva mais pessoal.</p>

              <div className="mt-8">
                <p className="mb-3 text-sm font-medium">Escolha seu caminho</p>
                <div className="grid gap-3">
                  <ModeCard selected={mode === 'consolidation'} onClick={() => setMode('consolidation')} icon={<Sparkles size={18} />} title="Consolidação guiada" description="Perguntas simples, em sequência, para fixar a aula." meta="Leve · recomendado" />
                  <ModeCard selected={mode === 'test'} onClick={() => setMode('test')} icon={<BrainCircuit size={18} />} title="Teste completo" description="Uma visão mais ampla do seu domínio nos objetivos." meta="Mais completo" />
                </div>
              </div>
              {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="status-start-error">{error}</p>}
              <button type="submit" disabled={loading} className="focus-ring mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60" data-testid="button-start-evaluation">
                {loading ? 'Preparando sua sessão...' : 'Começar agora'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent-foreground dark:text-accent">O que acontece aqui</p>
            <h2 className="mt-4 max-w-sm font-serif text-4xl leading-tight text-primary dark:text-foreground">Estudar também é saber onde olhar.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Feature icon={<FileText size={19} />} index="01" title="Relembre" copy="A aula vira perguntas curtas, em uma ordem que faz sentido." />
            <Feature icon={<Lightbulb size={19} />} index="02" title="Perceba" copy="O feedback mostra o avanço sem transformar erro em julgamento." />
            <Feature icon={<Check size={19} />} index="03" title="Aja" copy="Você termina com uma recomendação clara para a próxima revisão." />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function ModeCard({ selected, onClick, icon, title, description, meta }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; description: string; meta: string }) {
  return (
    <button type="button" onClick={onClick} className={`focus-ring flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${selected ? 'border-accent bg-accent/10' : 'border-border hover:border-primary/30 hover:bg-muted/50'}`} data-testid={`button-mode-${title.includes('guiada') ? 'consolidation' : 'test'}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${selected ? 'bg-accent text-accent-foreground' : 'bg-secondary text-primary dark:bg-primary/20 dark:text-accent'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <span className={`hidden shrink-0 font-mono text-[9px] uppercase tracking-wide sm:block ${selected ? 'text-primary dark:text-accent' : 'text-muted-foreground'}`}>{meta}</span>
    </button>
  );
}

function Feature({ icon, index, title, copy }: { icon: ReactNode; index: string; title: string; copy: string }) {
  return <div className="border-t-2 border-primary/15 pt-4"><div className="flex items-center justify-between text-accent-foreground dark:text-accent"><span>{icon}</span><span className="font-mono text-[10px]">{index}</span></div><h3 className="mt-7 font-serif text-2xl text-primary dark:text-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></div>;
}