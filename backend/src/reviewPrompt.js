export function buildReviewPrompt({ code, language }) {
  return [
    "You are an expert code reviewer.",
    "Return ONLY valid JSON (no markdown, no commentary).",
    "",
    "Goal: review the user's code and provide actionable feedback.",
    "",
    "JSON schema (must match exactly):",
    "{",
    '  "bugs_or_risks": ["string", "..."],',
    '  "optimizations": ["string", "..."],',
    '  "readability": ["string", "..."],',
    '  "security_notes": ["string", "..."],',
    '  "score": 0,',
    '  "summary": "string"',
    "}",
    "",
    "Rules:",
    "- Keep each bullet short and specific (1-2 sentences max).",
    "- If something is not applicable, return an empty array for that field.",
    "- Score is an integer 0-10, where 10 is excellent production-quality code.",
    "",
    `Language: ${language}`,
    "",
    "Code (verbatim):",
    code
  ].join("\n");
}

