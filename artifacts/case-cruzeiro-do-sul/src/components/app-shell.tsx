import { BookOpen, CheckCircle2, Moon, Sun, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useEffect, useState, type ReactNode } from 'react';

export function AppShell({ children, step }: { children: ReactNode; step?: number }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('consolida-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('consolida-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const studentName = localStorage.getItem('consolida-student') || '';
  const isHome = location === '/';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {!isHome && (
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex">
          <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" data-testid="link-sidebar-home">
            <div className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/10">
              <BookOpen size={19} strokeWidth={2.3} />
            </div>
            <div>
              <p className="font-serif text-[17px] leading-none text-sidebar-foreground">Consolida</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-accent-foreground/70">Cálculo I</p>
            </div>
          </Link>

          <div className="mt-14">
            <p className="px-3 font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">Seu percurso</p>
            <div className="relative mt-5 space-y-6">
              <div className="absolute left-[19px] top-3 h-[calc(100%-24px)] w-px bg-sidebar-border" />
              <ProgressStep number="01" label="Identificação" active={step === 1} done={step !== 1} />
              <ProgressStep number="02" label="Perguntas" active={step === 2} done={step === 3} />
              <ProgressStep number="03" label="Diagnóstico" active={step === 3} done={false} />
            </div>
          </div>

          <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-4">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-sidebar-primary" />
              <p className="text-[12px] leading-relaxed text-sidebar-foreground/75">
                Uma pausa curta agora ajuda a aula a ficar mais clara depois.
              </p>
            </div>
          </div>
        </aside>
      )}

      <header className={`${isHome ? '' : 'lg:pl-[248px]'} sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur-xl`}>
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="focus-ring flex items-center gap-2.5 lg:hidden" data-testid="link-mobile-home">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen size={17} />
            </div>
            <span className="font-serif text-lg">Consolida <span className="text-muted-foreground">/ Cálculo I</span></span>
          </Link>
          {isHome && (
            <div className="hidden items-center gap-3 lg:flex">
              <img src="/cruzeiro-logo.jpg" alt="Cruzeiro do Sul Virtual" className="brand-mark size-9 rounded-full object-cover" />
              <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Cruzeiro do Sul Virtual</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            {studentName && <span className="hidden text-sm text-muted-foreground sm:inline">Olá, <strong className="font-medium text-foreground">{studentName}</strong></span>}
            <button
              type="button"
              aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              onClick={() => setDark((value) => !value)}
              className="focus-ring grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              data-testid="button-toggle-theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>
      <main className={`${isHome ? '' : 'lg:pl-[248px]'} relative`}>{children}</main>
      <footer className={`${isHome ? '' : 'lg:pl-[248px]'} border-t border-border/70 px-5 py-6 text-center`}>
        <p className="font-mono text-[10px] tracking-[.08em] text-muted-foreground">Desenvolvido pelo candidato João Vitor Belasque</p>
      </footer>
    </div>
  );
}

function ProgressStep({ number, label, active, done }: { number: string; label: string; active: boolean; done: boolean }) {
  return (
    <div className="relative z-[1] flex items-center gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition ${active ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground' : done ? 'border-sidebar-primary/60 bg-sidebar-primary/15 text-sidebar-primary' : 'border-sidebar-border bg-sidebar text-sidebar-foreground/45'}`}>
        {done ? <CheckCircle2 size={16} /> : number}
      </div>
      <span className={`text-[13px] ${active ? 'font-medium text-sidebar-foreground' : 'text-sidebar-foreground/50'}`}>{label}</span>
    </div>
  );
}