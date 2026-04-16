import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App.jsx";

// Mock the api module to avoid real network requests
vi.mock("./api.js", () => ({
  requestReview: vi.fn(),
  getApiBaseUrl: vi.fn(() => "http://localhost:3001"),
}));

import { requestReview } from "./api.js";

const MOCK_RESULT = {
  mode: "mock",
  score: 7,
  summary: "Code is mostly good.",
  bugs_or_risks: ["No obvious functional bug pattern detected in this static review."],
  optimizations: ["No major performance issue detected; profile with real inputs before optimization."],
  readability: ["Debug logging found; remove or gate logs for production code."],
  security_notes: ["No obvious security anti-pattern detected in this static review."],
};

const MOCK_RESULT_WITH_BUGS = {
  mode: "mock",
  score: 3,
  summary: "Code has significant risks/bugs from static checks and needs fixes.",
  bugs_or_risks: [
    "Mismatched `{}` braces detected; this often causes syntax/runtime failures.",
    "Possible assignment inside `if` condition (`=` instead of `===`).",
  ],
  optimizations: ["No major performance issue detected; profile with real inputs before optimization."],
  readability: ["Debug logging found; remove or gate logs for production code."],
  security_notes: ["Direct `innerHTML` assignment can introduce XSS; prefer safer DOM APIs/sanitization."],
};

describe("App – VerdictPill is removed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render any 'Verdict:' text on initial render", () => {
    render(<App />);
    expect(screen.queryByText(/Verdict:/i)).toBeNull();
  });

  it("does not render 'Verdict:' text after a successful review result", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => expect(requestReview).toHaveBeenCalledTimes(1));
    await waitFor(() => screen.getByText("Code is mostly good."));

    expect(screen.queryByText(/Verdict:/i)).toBeNull();
  });

  it("does not render 'Verdict:' text when result has critical bugs", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT_WITH_BUGS);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code has significant risks/bugs from static checks and needs fixes."));

    expect(screen.queryByText(/Verdict:/i)).toBeNull();
  });

  it("does not render 'Verdict: pending review' before review is run", () => {
    render(<App />);
    expect(screen.queryByText(/Verdict: pending review/i)).toBeNull();
  });

  it("does not render 'Verdict: Needs fixes' label", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT_WITH_BUGS);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code has significant risks/bugs from static checks and needs fixes."));

    expect(screen.queryByText(/Verdict: Needs fixes/i)).toBeNull();
  });

  it("does not render 'Verdict: Looks correct' label", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code is mostly good."));

    expect(screen.queryByText(/Verdict: Looks correct/i)).toBeNull();
  });
});

describe("App – Issues count display is removed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render 'Issues:' count text on initial render", () => {
    render(<App />);
    expect(screen.queryByText(/^Issues:/i)).toBeNull();
  });

  it("does not render 'Issues:' count text after successful review", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT_WITH_BUGS);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code has significant risks/bugs from static checks and needs fixes."));

    expect(screen.queryByText(/Issues:\s*\d+/i)).toBeNull();
  });

  it("does not render 'Issues: 0' when there are no real bugs", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code is mostly good."));

    expect(screen.queryByText(/Issues: 0/i)).toBeNull();
  });
});

describe("App – core rendering still works after removals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    render(<App />);
    expect(screen.getByText("AI Code Reviewer")).toBeTruthy();
  });

  it("renders the Review code button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /review code/i })).toBeTruthy();
  });

  it("renders the code textarea", () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/paste your code here/i)).toBeTruthy();
  });

  it("renders the language selector with JavaScript as default", () => {
    render(<App />);
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("JavaScript");
  });

  it("renders ScorePill with 0/10 before any review", () => {
    render(<App />);
    expect(screen.getByText("0/10")).toBeTruthy();
  });

  it("renders summary placeholder text before any review", () => {
    render(<App />);
    expect(screen.getByText("Run a review to see a concise summary here.")).toBeTruthy();
  });

  it("shows the score after a review", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("7/10"));

    expect(screen.getByText("7/10")).toBeTruthy();
  });

  it("shows the summary after a review", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Code is mostly good."));

    expect(screen.getByText("Code is mostly good.")).toBeTruthy();
  });

  it("shows error message when review request fails", async () => {
    requestReview.mockRejectedValueOnce(new Error("Network error"));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText("Network error"));

    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("shows mock mode banner when result.mode is 'mock'", async () => {
    requestReview.mockResolvedValueOnce(MOCK_RESULT);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /review code/i }));
    await waitFor(() => screen.getByText(/Mock mode/i));

    expect(screen.getByText(/Mock mode/i)).toBeTruthy();
  });

  it("does not show mock mode banner before a review is run", () => {
    render(<App />);
    expect(screen.queryByText(/Mock mode/i)).toBeNull();
  });
});