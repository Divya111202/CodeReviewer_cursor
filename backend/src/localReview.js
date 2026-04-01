function langName(language) {
  return (language || "").toLowerCase();
}

function hasBalancedPairs(code, open, close) {
  let count = 0;
  for (const ch of code) {
    if (ch === open) count += 1;
    if (ch === close) count -= 1;
    if (count < 0) return false;
  }
  return count === 0;
}

function reviewJavaScript(code, bugs, optimizations, readability, security) {
  if (!hasBalancedPairs(code, "{", "}")) {
    bugs.push("Mismatched `{}` braces detected; this often causes syntax/runtime failures.");
  }
  if (!hasBalancedPairs(code, "(", ")")) {
    bugs.push("Mismatched `()` parentheses detected.");
  }
  if (/if\s*\([^)]*=[^=][^)]*\)/.test(code)) {
    bugs.push("Possible assignment inside `if` condition (`=` instead of `===`).");
  }
  if (/\b(var)\s+/.test(code)) {
    readability.push("Use `let`/`const` instead of `var` for safer scoping.");
  }
  if (/\bwhile\s*\(\s*true\s*\)/.test(code) && !/\bbreak\b/.test(code)) {
    bugs.push("Potential infinite loop: `while(true)` without an obvious `break`.");
  }
  if (/\.innerHTML\s*=/.test(code)) {
    security.push("Direct `innerHTML` assignment can introduce XSS; prefer safer DOM APIs/sanitization.");
  }
  if (/\beval\s*\(|\bnew Function\s*\(/.test(code)) {
    security.push("Dynamic code execution (`eval`/`Function`) increases injection risk.");
  }
  if (/\bfor\s*\(.*\)\s*\{[\s\S]{0,400}\bfor\s*\(/.test(code)) {
    optimizations.push("Nested loops found; consider maps/sets or pre-indexing for better performance.");
  }
}

function reviewPython(code, bugs, optimizations, readability, security) {
  if (/^\t+.+/m.test(code) && /^ +.+/m.test(code)) {
    bugs.push("Mixed tabs and spaces detected; Python indentation may fail.");
  }
  if (/if\s+.+\s=\s.+:/.test(code)) {
    bugs.push("Possible assignment in condition (`=`) where `==` may be intended.");
  }
  if (/\bwhile\s+True\s*:/.test(code) && !/\bbreak\b/.test(code)) {
    bugs.push("Potential infinite loop: `while True` without an obvious `break`.");
  }
  if (/input\(/.test(code) && /int\(\s*input\(/.test(code) === false) {
    readability.push("If numeric input is expected, cast `input()` explicitly (for example `int(input())`).");
  }
  if (/subprocess\..+shell\s*=\s*True/.test(code)) {
    security.push("Using `subprocess` with `shell=True` can be dangerous with untrusted input.");
  }
  if (/\bfor\s+\w+\s+in\s+range\(.+\):[\s\S]{0,400}\bfor\s+\w+\s+in\s+range\(/.test(code)) {
    optimizations.push("Nested `for` loops detected; check if algorithmic complexity can be reduced.");
  }
}

export function localReview({ code, language }) {
  const c = (code || "").trim();
  const lang = langName(language);

  const bugs_or_risks = [];
  const optimizations = [];
  const readability = [];
  const security_notes = [];

  if (!c) {
    return {
      mode: "mock",
      bugs_or_risks: ["No code provided."],
      optimizations: [],
      readability: [],
      security_notes: [],
      score: 0,
      summary: "No review generated because the input is empty."
    };
  }

  if (lang.includes("python")) {
    reviewPython(c, bugs_or_risks, optimizations, readability, security_notes);
  } else {
    reviewJavaScript(c, bugs_or_risks, optimizations, readability, security_notes);
  }

  if (/(console\.log|print\()/i.test(c)) {
    readability.push("Debug logging found; remove or gate logs for production code.");
  }
  if (c.split("\n").some((line) => line.length > 140)) {
    readability.push("Very long lines found; wrapping lines improves readability and reviews.");
  }
  if (/\b(password|secret|api[_-]?key|token)\b/i.test(c) && /["'][^"']{8,}["']/.test(c)) {
    security_notes.push("Potential hard-coded secret/token-like value detected; move secrets to environment variables.");
  }
  if (/\/\s*0(?!\d)/.test(c)) {
    bugs_or_risks.push("Possible division-by-zero detected.");
  }

  if (!bugs_or_risks.length) {
    bugs_or_risks.push("No obvious functional bug pattern detected in this static review.");
  }
  if (!security_notes.length) {
    security_notes.push("No obvious security anti-pattern detected in this static review.");
  }
  if (!optimizations.length) {
    optimizations.push("No major performance issue detected; profile with real inputs before optimization.");
  }

  const penalty =
    bugs_or_risks.filter((x) => !x.startsWith("No obvious")).length * 2 +
    security_notes.filter((x) => !x.startsWith("No obvious")).length * 2 +
    optimizations.filter((x) => !x.startsWith("No major")).length +
    readability.length;

  const score = Math.max(1, Math.min(10, 10 - penalty));
  const summary =
    score >= 8
      ? "Code looks mostly correct from static checks, with minor improvements suggested."
      : score >= 5
        ? "Code is partly correct but has issues worth fixing before production use."
        : "Code has significant risks/bugs from static checks and needs fixes.";

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

