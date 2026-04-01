import { useMemo, useState } from "react";
import Section from "./components/Section.jsx";
import { requestReview } from "./api.js";

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
  "SQL",
  "HTML",
  "CSS"
];

function ScorePill({ score }) {
  const { label, classes } = useMemo(() => {
    if (score >= 9) return { label: "Excellent", classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" };
    if (score >= 7) return { label: "Good", classes: "bg-sky-500/15 text-sky-300 border-sky-500/40" };
    if (score >= 5) return { label: "Fair", classes: "bg-amber-500/15 text-amber-300 border-amber-500/40" };
    return { label: "Needs work", classes: "bg-rose-500/15 text-rose-300 border-rose-500/40" };
  }, [score]);

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${classes}`}>
      <span className="font-semibold">{score}/10</span>
      <span className="text-slate-200/80">{label}</span>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState("JavaScript");
  const [code, setCode] = useState(`function sum(a, b){\n  return a+b\n}\n\nconsole.log(sum(1, 2))\n`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await requestReview({ code, language });
      setResult(data);
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">AI Code Reviewer</h1>
            <a
              className="text-sm text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-white"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              title="Update this link to your repo"
            >
              GitHub
            </a>
          </div>
          <p className="text-sm text-slate-300">
            Paste code, pick a language, and get bugs/risks, optimization ideas, readability feedback, security notes, and a quality score.
          </p>
          {result?.mode === "mock" ? (
            <div className="w-fit rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
              Mock mode: add `ANTHROPIC_API_KEY` in `backend/.env` for real AI reviews.
            </div>
          ) : null}
        </header>

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300">Language</label>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-60"
                type="submit"
                disabled={loading || !code.trim()}
              >
                {loading ? "Reviewing..." : "Review code"}
              </button>
            </div>

            <textarea
              className="min-h-[420px] w-full resize-y rounded-xl border border-slate-800 bg-slate-950/40 p-4 font-mono text-sm text-slate-100 outline-none focus:border-slate-600"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder="Paste your code here..."
            />

            {error ? (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-300">Quality score</p>
                  <p className="mt-1 text-sm text-slate-400">Overall rating for production readiness.</p>
                </div>
                <ScorePill score={Number.isFinite(result?.score) ? result.score : 0} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <p className="text-xs font-semibold text-slate-300">Summary</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  {result?.summary || "Run a review to see a concise summary here."}
                </p>
              </div>
            </section>

            <div className="grid gap-4">
              <Section title="Bugs / Risks" items={result?.bugs_or_risks || []} />
              <Section title="Optimizations" items={result?.optimizations || []} />
              <Section title="Readability" items={result?.readability || []} />
              <Section title="Security notes" items={result?.security_notes || []} />
            </div>
          </aside>
        </form>

        <footer className="mt-10 text-xs text-slate-500">
          Backend endpoint: <span className="text-slate-300">POST /api/review</span>
        </footer>
      </div>
    </div>
  );
}

