/**
 * Anonymous quiz results. Every answer is kept locally (so the quiz and its results screen work
 * offline) and, if a backend is configured at build time, also sent as one anonymous row:
 * { session, question, correct, mode, ms }. No names, emails, IPs or device data are collected.
 *
 * Backend: Supabase free tier, REST, anon key with row-level security that only allows INSERT on
 * quiz_answers and SELECT on the aggregate view quiz_stats.
 * Configure with VITE_QUIZ_ENDPOINT and VITE_QUIZ_ANON_KEY (GitHub repository variables, never
 * committed). Without them, stats are local only and labelled so.
 */
const ENDPOINT = (import.meta.env.VITE_QUIZ_ENDPOINT as string | undefined)?.replace(/\/$/, '');
const KEY = import.meta.env.VITE_QUIZ_ANON_KEY as string | undefined;
const LOCAL = 'earth-jukebox:quiz';

export const backendConfigured = !!(ENDPOINT && KEY);

export interface Answer {
  session: string;
  question: string;
  correct: boolean;
  mode: 'musical' | 'data';
  ms: number;
}

export interface QuestionStat {
  question: string;
  answers: number;
  correctRate: number;
}

export interface Stats {
  source: 'live' | 'local';
  answers: number;
  correctRate: number;
  perQuestion: QuestionStat[];
}

/** Random, per-visit id so answers from one run can be grouped; not linked to anyone. */
export const newSession = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readLocal(): Answer[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]') as Answer[];
  } catch {
    return [];
  }
}

export async function logAnswer(a: Answer): Promise<void> {
  try {
    localStorage.setItem(LOCAL, JSON.stringify([...readLocal(), a].slice(-400)));
  } catch {
    /* storage blocked: the quiz still works */
  }
  if (!backendConfigured) return;
  try {
    await fetch(`${ENDPOINT}/rest/v1/quiz_answers`, {
      method: 'POST',
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(a),
      keepalive: true,
    });
  } catch {
    /* offline or backend down: the local copy is enough for this visitor */
  }
}

function summarise(rows: { question: string; answers: number; correct: number }[], source: Stats['source']): Stats {
  const answers = rows.reduce((s, r) => s + r.answers, 0);
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  return {
    source,
    answers,
    correctRate: answers ? correct / answers : 0,
    perQuestion: rows.map((r) => ({ question: r.question, answers: r.answers, correctRate: r.answers ? r.correct / r.answers : 0 })),
  };
}

/** Live aggregate from the backend if configured and reachable; otherwise this browser's own answers. */
export async function loadStats(): Promise<Stats> {
  if (backendConfigured) {
    try {
      const res = await fetch(`${ENDPOINT}/rest/v1/quiz_stats?select=question,answers,correct`, {
        headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
      });
      if (res.ok) {
        const rows = (await res.json()) as { question: string; answers: number; correct: number }[];
        return summarise(rows, 'live');
      }
    } catch {
      /* fall through to local */
    }
  }
  const byQ = new Map<string, { question: string; answers: number; correct: number }>();
  for (const a of readLocal()) {
    const r = byQ.get(a.question) ?? { question: a.question, answers: 0, correct: 0 };
    r.answers++;
    r.correct += a.correct ? 1 : 0;
    byQ.set(a.question, r);
  }
  return summarise([...byQ.values()], 'local');
}
