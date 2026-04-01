import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { buildReviewPrompt } from "./reviewPrompt.js";
import { localReview } from "./localReview.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173"
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const ReviewRequestSchema = z.object({
  code: z.string().min(1).max(200_000),
  language: z.string().min(1).max(50)
});

const ReviewResponseSchema = z.object({
  mode: z.enum(["ai", "mock"]).optional(),
  bugs_or_risks: z.array(z.string()),
  optimizations: z.array(z.string()),
  readability: z.array(z.string()),
  security_notes: z.array(z.string()),
  score: z.number().int().min(0).max(10),
  summary: z.string()
});

app.post("/api/review", async (req, res) => {
  try {
    const parsed = ReviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten()
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      return res.json(localReview(parsed.data));
    }

    const client = new Anthropic({ apiKey });
    const prompt = buildReviewPrompt(parsed.data);

    const msg = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = msg.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Model did not return valid JSON",
        raw: text.slice(0, 4000)
      });
    }

    const reviewed = ReviewResponseSchema.safeParse({ mode: "ai", ...json });
    if (!reviewed.success) {
      return res.status(502).json({
        error: "Model JSON did not match expected schema",
        details: reviewed.error.flatten(),
        raw: json
      });
    }

    return res.json(reviewed.data);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      Number(err.status) === 401
    ) {
      // Fall back to mock review if API key is invalid.
      return res.json(localReview(req.body || {}));
    }

    const message =
      err instanceof Error ? err.message : "Unknown server error";
    return res.status(500).json({ error: message });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

