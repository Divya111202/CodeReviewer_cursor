function pickLanguageHints(language) {
  const lang = (language || "").toLowerCase();
  if (lang.includes("python")) return { semicolons: false, types: false };
  if (lang.includes("typescript")) return { semicolons: true, types: true };
  if (lang.includes("javascript")) return { semicolons: true, types: false };
  return { semicolons: true, types: false };
}

export function localReview({ code, language }) {
  const c = code || "";
  const hints = pickLanguageHints(language);

  const bugs_or_risks = [];
  const optimizations = [];
  const readability = [];
  const security_notes = [];

  if (c.length > 50_000) {
    bugs_or_risks.push("Very large input: consider reviewing smaller modules/files for more precise feedback.");
  }

  if (/(console\.log|print\()/i.test(c)) {
    readability.push("Debug logging detected. Consider removing or gating it behind a debug flag before production.");
  }

  if (/\beval\s*\(/i.test(c) || /\bnew Function\s*\(/i.test(c)) {
    security_notes.push("Avoid dynamic code execution (`eval`/`Function`) unless absolutely necessary; it increases injection risk.");
  }

  if (/\b(password|secret|api[_-]?key|token)\b/i.test(c)) {
    security_notes.push("Potential secret-related identifiers found. Ensure secrets are not hard-coded and are loaded from environment/secret manager.");
  }

  if (/\bfor\s*\(.*;.*;.*\)\s*\{[\s\S]*\bfor\s*\(/i.test(c)) {
    optimizations.push("Nested loops detected. If input sizes can grow, consider optimizing with hashing/indexing to reduce time complexity.");
  }

  if (hints.semicolons && /return\s+[^\n;]+(\n|$)/.test(c) && /function\s+\w+\s*\(/.test(c)) {
    readability.push("Inconsistent semicolon/formatting. Consider using a formatter (Prettier) for consistent style.");
  }

  if (c.split("\n").some((l) => l.length > 140)) {
    readability.push("Some lines are very long. Wrapping long lines improves readability.");
  }

  if (!c.trim()) {
    bugs_or_risks.push("No code provided.");
  }

  if (!bugs_or_risks.length && !optimizations.length && !readability.length && !security_notes.length) {
    readability.push("Looks reasonable at a quick glance. Add tests and run a linter/formatter for stronger confidence.");
  }

  let score = 7;
  score -= Math.min(4, security_notes.length);
  score -= Math.min(3, bugs_or_risks.length);
  score -= Math.min(2, readability.length > 2 ? 1 : 0);
  score = Math.max(0, Math.min(10, score));

  const summary =
    score >= 8
      ? "Solid baseline. Consider adding tests and tightening style consistency."
      : score >= 6
        ? "Good start with a few improvements recommended for quality and safety."
        : "Several improvements recommended before considering this production-ready.";

  return {
    mode: "mock",
    bugs_or_risks,
    optimizations,
    readability,
    security_notes,
    score,
    summary
  };
}

