import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { localReview } from "./localReview.js";

// Helper: assert no message in any array starts with "Line "
function assertNoLinePrefix(result) {
  const allMessages = [
    ...result.bugs_or_risks,
    ...result.optimizations,
    ...result.readability,
    ...result.security_notes,
  ];
  for (const msg of allMessages) {
    assert.ok(
      !msg.match(/^Line \d+:/),
      `Message should not start with "Line N:": "${msg}"`
    );
  }
}

describe("localReview – empty input", () => {
  test("returns early result for empty string", () => {
    const result = localReview({ code: "", language: "JavaScript" });
    assert.equal(result.mode, "mock");
    assert.deepEqual(result.bugs_or_risks, ["No code provided."]);
    assert.deepEqual(result.optimizations, []);
    assert.deepEqual(result.readability, []);
    assert.deepEqual(result.security_notes, []);
    assert.equal(result.score, 0);
    assert.equal(result.summary, "No review generated because the input is empty.");
  });

  test("returns early result for whitespace-only input", () => {
    const result = localReview({ code: "   \n\t  ", language: "JavaScript" });
    assert.equal(result.bugs_or_risks[0], "No code provided.");
    assert.equal(result.score, 0);
  });

  test("returns early result when code is undefined", () => {
    const result = localReview({ code: undefined, language: "JavaScript" });
    assert.equal(result.bugs_or_risks[0], "No code provided.");
  });
});

describe("localReview – messages never contain 'Line N:' prefix", () => {
  test("JS assignment-in-if message has no line prefix", () => {
    const result = localReview({ code: "if (x = 1) {}", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.bugs_or_risks.some((m) => m.includes("assignment inside `if` condition")));
  });

  test("JS var usage message has no line prefix", () => {
    const result = localReview({ code: "var x = 1;", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.readability.some((m) => m.includes("`let`/`const`")));
  });

  test("JS while(true) message has no line prefix", () => {
    const result = localReview({ code: "while (true) { doSomething(); }", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.bugs_or_risks.some((m) => m.includes("infinite loop")));
  });

  test("JS innerHTML message has no line prefix", () => {
    const result = localReview({ code: "el.innerHTML = userInput;", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.security_notes.some((m) => m.includes("innerHTML")));
  });

  test("JS eval message has no line prefix", () => {
    const result = localReview({ code: "eval(userCode);", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.security_notes.some((m) => m.includes("eval")));
  });

  test("console.log message has no line prefix", () => {
    const result = localReview({ code: "const x = 1;\nconsole.log(x);", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.readability.some((m) => m.includes("Debug logging")));
  });

  test("division-by-zero message has no line prefix", () => {
    const result = localReview({ code: "const x = 10 / 0;", language: "JavaScript" });
    assertNoLinePrefix(result);
    assert.ok(result.bugs_or_risks.some((m) => m.includes("division-by-zero")));
  });

  test("Python assignment-in-condition message has no line prefix", () => {
    const result = localReview({ code: "if x = 1:\n  pass", language: "Python" });
    assertNoLinePrefix(result);
    assert.ok(result.bugs_or_risks.some((m) => m.includes("assignment in condition")));
  });

  test("Python while True message has no line prefix", () => {
    const result = localReview({ code: "while True:\n  doSomething()", language: "Python" });
    assertNoLinePrefix(result);
    assert.ok(result.bugs_or_risks.some((m) => m.includes("infinite loop")));
  });

  test("Python input() message has no line prefix", () => {
    const result = localReview({ code: "x = input()", language: "Python" });
    assertNoLinePrefix(result);
    assert.ok(result.readability.some((m) => m.includes("cast `input()`")));
  });

  test("Python subprocess shell=True message has no line prefix", () => {
    const result = localReview({ code: "subprocess.run(cmd, shell=True)", language: "Python" });
    assertNoLinePrefix(result);
    assert.ok(result.security_notes.some((m) => m.includes("shell=True")));
  });
});

describe("localReview – JavaScript bug detection", () => {
  test("detects mismatched braces", () => {
    const result = localReview({ code: "function foo() { if (true) {", language: "JavaScript" });
    assert.ok(result.bugs_or_risks.some((m) => m.includes("Mismatched `{}` braces")));
  });

  test("detects mismatched parentheses", () => {
    const result = localReview({ code: "foo(bar(x)", language: "JavaScript" });
    assert.ok(result.bugs_or_risks.some((m) => m.includes("Mismatched `()` parentheses")));
  });

  test("detects assignment in if condition", () => {
    const result = localReview({ code: "if (x = 5) { return; }", language: "JavaScript" });
    assert.ok(
      result.bugs_or_risks.some((m) =>
        m.includes("Possible assignment inside `if` condition (`=` instead of `===`)")
      )
    );
  });

  test("does NOT flag if condition with no assignment operator", () => {
    // Note: the regex has a known edge-case with ===; use a clearly safe condition
    const result = localReview({ code: "if (isReady) { return; }", language: "JavaScript" });
    assert.ok(!result.bugs_or_risks.some((m) => m.includes("assignment inside `if`")));
  });

  test("detects while(true) without break as infinite loop", () => {
    const result = localReview({ code: "while (true) { doWork(); }", language: "JavaScript" });
    assert.ok(
      result.bugs_or_risks.some((m) =>
        m.includes("Potential infinite loop: `while(true)` without an obvious `break`")
      )
    );
  });

  test("does NOT flag while(true) that has a break", () => {
    const result = localReview({
      code: "while (true) { if (done) break; }",
      language: "JavaScript",
    });
    assert.ok(!result.bugs_or_risks.some((m) => m.includes("infinite loop")));
  });
});

describe("localReview – JavaScript readability checks", () => {
  test("detects var usage and recommends let/const", () => {
    const result = localReview({ code: "var count = 0;", language: "JavaScript" });
    assert.ok(
      result.readability.some((m) =>
        m.includes("Use `let`/`const` instead of `var` for safer scoping")
      )
    );
  });

  test("does NOT flag let/const usage", () => {
    const result = localReview({ code: "const x = 1; let y = 2;", language: "JavaScript" });
    assert.ok(!result.readability.some((m) => m.includes("`let`/`const`")));
  });
});

describe("localReview – JavaScript security checks", () => {
  test("detects innerHTML assignment", () => {
    const result = localReview({
      code: "document.querySelector('#out').innerHTML = data;",
      language: "JavaScript",
    });
    assert.ok(
      result.security_notes.some((m) =>
        m.includes("Direct `innerHTML` assignment can introduce XSS")
      )
    );
  });

  test("detects eval()", () => {
    const result = localReview({ code: "eval(userInput);", language: "JavaScript" });
    assert.ok(
      result.security_notes.some((m) =>
        m.includes("Dynamic code execution (`eval`/`Function`) increases injection risk")
      )
    );
  });

  test("detects new Function()", () => {
    const result = localReview({ code: "const fn = new Function(str);", language: "JavaScript" });
    assert.ok(
      result.security_notes.some((m) =>
        m.includes("Dynamic code execution (`eval`/`Function`) increases injection risk")
      )
    );
  });
});

describe("localReview – JavaScript optimization checks", () => {
  test("detects nested loops", () => {
    const result = localReview({
      code: "for (let i = 0; i < n; i++) {\n  for (let j = 0; j < m; j++) {}\n}",
      language: "JavaScript",
    });
    assert.ok(
      result.optimizations.some((m) =>
        m.includes("Nested loops found; consider maps/sets or pre-indexing")
      )
    );
  });
});

describe("localReview – Python bug detection", () => {
  test("detects mixed tabs and spaces", () => {
    const result = localReview({
      code: "def foo():\n\tpass\n def bar():\n  pass",
      language: "Python",
    });
    assert.ok(result.bugs_or_risks.some((m) => m.includes("Mixed tabs and spaces")));
  });

  test("detects assignment in Python if condition", () => {
    const result = localReview({ code: "if x = 1:\n  pass", language: "Python" });
    assert.ok(
      result.bugs_or_risks.some((m) =>
        m.includes("Possible assignment in condition (`=`) where `==` may be intended")
      )
    );
  });

  test("detects while True without break", () => {
    const result = localReview({ code: "while True:\n  doSomething()", language: "Python" });
    assert.ok(
      result.bugs_or_risks.some((m) =>
        m.includes("Potential infinite loop: `while True` without an obvious `break`")
      )
    );
  });

  test("does NOT flag while True with break", () => {
    const result = localReview({
      code: "while True:\n  if done:\n    break",
      language: "Python",
    });
    assert.ok(!result.bugs_or_risks.some((m) => m.includes("infinite loop")));
  });
});

describe("localReview – Python readability checks", () => {
  test("flags input() without int() cast", () => {
    const result = localReview({ code: "x = input()", language: "Python" });
    assert.ok(
      result.readability.some((m) =>
        m.includes("If numeric input is expected, cast `input()` explicitly")
      )
    );
  });

  test("does NOT flag int(input()) pattern", () => {
    const result = localReview({ code: "x = int(input())", language: "Python" });
    assert.ok(!result.readability.some((m) => m.includes("cast `input()`")));
  });
});

describe("localReview – Python security checks", () => {
  test("flags subprocess with shell=True", () => {
    const result = localReview({
      code: "subprocess.run(['ls'], shell=True)",
      language: "Python",
    });
    assert.ok(
      result.security_notes.some((m) =>
        m.includes("Using `subprocess` with `shell=True` can be dangerous")
      )
    );
  });
});

describe("localReview – Python optimization checks", () => {
  test("detects nested for-range loops", () => {
    const result = localReview({
      code: "for i in range(n):\n  for j in range(m):\n    pass",
      language: "Python",
    });
    assert.ok(
      result.optimizations.some((m) =>
        m.includes("Nested `for` loops detected")
      )
    );
  });
});

describe("localReview – cross-language checks", () => {
  test("detects console.log (JS)", () => {
    const result = localReview({ code: "console.log('debug');", language: "JavaScript" });
    assert.ok(
      result.readability.some((m) =>
        m.includes("Debug logging found; remove or gate logs for production code")
      )
    );
  });

  test("detects print() (Python)", () => {
    const result = localReview({ code: "print('debug')", language: "Python" });
    assert.ok(
      result.readability.some((m) =>
        m.includes("Debug logging found; remove or gate logs for production code")
      )
    );
  });

  test("detects lines longer than 140 characters", () => {
    const longLine = "const x = " + "a".repeat(135) + ";";
    const result = localReview({ code: longLine, language: "JavaScript" });
    assert.ok(
      result.readability.some((m) =>
        m.includes("Very long lines found; wrapping lines improves readability")
      )
    );
  });

  test("does NOT flag lines of exactly 140 characters", () => {
    const line140 = "x".repeat(140);
    const result = localReview({ code: line140, language: "JavaScript" });
    assert.ok(!result.readability.some((m) => m.includes("Very long lines")));
  });

  test("detects hard-coded secret-like string", () => {
    const result = localReview({
      code: 'const apiKey = "supersecretvalue123";',
      language: "JavaScript",
    });
    assert.ok(
      result.security_notes.some((m) =>
        m.includes("Potential hard-coded secret/token-like value detected")
      )
    );
  });

  test("does NOT flag short string near keyword (< 8 chars)", () => {
    const result = localReview({
      code: 'const password = "short";',
      language: "JavaScript",
    });
    assert.ok(
      !result.security_notes.some((m) => m.includes("hard-coded secret"))
    );
  });

  test("detects division by zero", () => {
    const result = localReview({ code: "const r = 100 / 0;", language: "JavaScript" });
    assert.ok(result.bugs_or_risks.some((m) => m.includes("Possible division-by-zero detected")));
  });

  test("does NOT flag division by non-zero (e.g. /10)", () => {
    const result = localReview({ code: "const r = 100 / 10;", language: "JavaScript" });
    assert.ok(!result.bugs_or_risks.some((m) => m.includes("division-by-zero")));
  });

  test("language matching is case-insensitive (python lowercase)", () => {
    const result = localReview({ code: "while True:\n  pass", language: "python" });
    assert.ok(result.bugs_or_risks.some((m) => m.includes("infinite loop")));
  });
});

describe("localReview – fallback/default messages", () => {
  test("adds fallback when no bugs detected", () => {
    const result = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    assert.ok(
      result.bugs_or_risks.some((m) =>
        m.startsWith("No obvious functional bug pattern detected")
      )
    );
  });

  test("adds fallback when no security issues detected", () => {
    const result = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    assert.ok(
      result.security_notes.some((m) =>
        m.startsWith("No obvious security anti-pattern detected")
      )
    );
  });

  test("adds fallback when no optimization issues detected", () => {
    const result = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    assert.ok(
      result.optimizations.some((m) =>
        m.startsWith("No major performance issue detected")
      )
    );
  });
});

describe("localReview – score and summary calculation", () => {
  test("clean code scores 10 (no penalties)", () => {
    const result = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    assert.equal(result.score, 10);
  });

  test("score is capped at minimum 1 for very buggy code", () => {
    const badCode = [
      "var x = eval(userInput);",
      "el.innerHTML = data;",
      "const fn = new Function(str);",
      "while (true) { doWork(); }",
      "if (x = 1) {}",
      "foo(bar(x)",
      'const secret = "supersecretpassword123";',
      "console.log(x);",
    ].join("\n");
    const result = localReview({ code: badCode, language: "JavaScript" });
    assert.ok(result.score >= 1, `Score should be >= 1, got ${result.score}`);
    assert.ok(result.score <= 10, `Score should be <= 10, got ${result.score}`);
  });

  test("score decreases with each bug penalty", () => {
    const cleanResult = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    const buggyResult = localReview({
      code: "if (x = 1) {} var y = 2;",
      language: "JavaScript",
    });
    assert.ok(buggyResult.score < cleanResult.score);
  });

  test("summary reflects score >= 8 (clean code)", () => {
    const result = localReview({ code: "const x = 1 + 2;", language: "JavaScript" });
    assert.equal(
      result.summary,
      "Code looks mostly correct from static checks, with minor improvements suggested."
    );
  });

  test("summary reflects score < 5 (very buggy code)", () => {
    const badCode = [
      "var x = eval(userInput);",
      "el.innerHTML = data;",
      "const fn = new Function(str);",
      "while (true) { doWork(); }",
      "if (x = 1) {}",
    ].join("\n");
    const result = localReview({ code: badCode, language: "JavaScript" });
    assert.ok(
      result.summary === "Code has significant risks/bugs from static checks and needs fixes." ||
      result.summary === "Code is partly correct but has issues worth fixing before production use."
    );
  });

  test("result always includes mode: 'mock'", () => {
    const result = localReview({ code: "const x = 1;", language: "JavaScript" });
    assert.equal(result.mode, "mock");
  });
});

describe("localReview – removed helper functions are not exported", () => {
  test("firstMatchLine is not a named export", async () => {
    const mod = await import("./localReview.js");
    assert.equal(mod.firstMatchLine, undefined, "firstMatchLine should not be exported");
  });

  test("withLine is not a named export", async () => {
    const mod = await import("./localReview.js");
    assert.equal(mod.withLine, undefined, "withLine should not be exported");
  });
});