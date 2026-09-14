import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini AI Action Plan endpoint to raise team pulse > 80%
app.post("/api/ai-action-plan", async (req, res) => {
  try {
    const {
      overallPercentage = 70,
      averageScore = 3.5,
      count = 5,
      lowestQuestions = [],
      topQuestions = [],
      customFeedback
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback deterministic recommendations based on lowest questions
      return res.json(generateFallbackActionPlan(overallPercentage, lowestQuestions));
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const lowestPromptDesc = lowestQuestions.length > 0
      ? lowestQuestions
          .map(
            (q: any, i: number) =>
              `${i + 1}. [Frage ID ${q.id} - ${q.tag}]: "${q.title}" -> Score: ${q.score}/5 (${q.percentage}%)`
          )
          .join("\n")
      : "Keine Einzelfragen unter 3.0";

    const topPromptDesc = topQuestions.length > 0
      ? topQuestions
          .map((q: any) => `[${q.tag}]: ${q.score}/5 (${q.percentage}%)`)
          .join(", ")
      : "Keine";

    const customDesc = customFeedback?.count
      ? `Custom Teams-Frage: Ø ${customFeedback.score}/5, Kommentare: ${customFeedback.comments.join(", ")}`
      : "Keine Custom Frage";

    const prompt = `Du bist ein erfahrener agiler Team-Coach für Audi IT-Entwicklungsteams.
Das Team hat soeben die wöchentliche anonyme Teamrunde durchgeführt.
Aktueller Stimmungs-Score: ${overallPercentage}% (Ø ${averageScore}/5 bei ${count} Teilnehmern).
Ziel: Sofortige, pragmatische Hebel definieren, um den Team-Puls in der nächsten Woche stabil auf ÜBER 80% zu bringen!

Die am niedrigsten bewerteten Fragen (Hauptbremsen):
${lowestPromptDesc}

Stärken des Teams (Vorhandene Ressourcen):
${topPromptDesc}

Zusatzinformationen:
${customDesc}

Erstelle 3 konkrete, hochwirksame und sofort in der Teamrunde besprechbare Maßnahmen. Formuliere präzise im Audi-Stil (technisch, kollegial, lösungsorientiert).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Du bist ein agiler Coach bei Audi IT. Antworte immer auf Deutsch im strukturierten JSON-Format ohne Markdown-Wrapper.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentPercentage: { type: Type.NUMBER },
            targetPercentage: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  questionContext: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  potentialImpact: { type: Type.STRING }
                },
                required: ["priority", "title", "questionContext", "recommendation", "potentialImpact"]
              }
            }
          },
          required: ["currentPercentage", "targetPercentage", "summary", "actions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Gemini API error:", error);
    // Return high quality fallback
    const { overallPercentage = 70, lowestQuestions = [] } = req.body || {};
    return res.json(generateFallbackActionPlan(overallPercentage, lowestQuestions));
  }
});

function generateFallbackActionPlan(overallPercentage: number, lowestQuestions: any[]) {
  const targetPercentage = Math.max(82, overallPercentage + 14);

  const defaultActions = [
    {
      priority: 1,
      title: "Moderations-Rotation & Rollen-Klarheit etablieren",
      questionContext: lowestQuestions[0]?.title || "Moderation & Team-Rollen",
      recommendation:
        "Moderation der Teamrunde fest als freiwilliges Tandem vergeben (Senior + Junior) statt Einzelbelastung. Meeting auf knackige 25 Minuten begrenzen.",
      potentialImpact: "+12% Zufriedenheit bei Team-Organisation"
    },
    {
      priority: 2,
      title: "Fokuszeit-Blocker & Feierabend-Grenzen vereinbaren",
      questionContext: lowestQuestions[1]?.title || "Workload & Feierabend",
      recommendation:
        "Einführung von 'Meeting-freien Vormittagen' (z.B. Di/Do) für ungestörte Deep-Work-Phasen, um späte Überstunden abzubauen.",
      potentialImpact: "+15% bei Energie & Work-Life-Balance"
    },
    {
      priority: 3,
      title: "Tooling-Hindernisse im nächsten Sprint priorisieren",
      questionContext: lowestQuestions[2]?.title || "Tooling & Infrastruktur",
      recommendation:
        "Konkrete Pipeline-Bremsen als 'Quick Win'-Ticket im nächsten Sprint einplanen, um wiederkehrenden Entwickler-Frust sofort zu beenden.",
      potentialImpact: "+10% Flow und Entwickler-Geschwindigkeit"
    }
  ];

  return {
    currentPercentage: overallPercentage,
    targetPercentage,
    summary: `Mit gezielten Anpassungen an den schwächsten Stellen (${lowestQuestions.map((q: any) => q.tag).filter(Boolean).join(", ") || "Workload und Organisation"}) kann der Team-Puls von ${overallPercentage}% schnell über ${targetPercentage}% gehoben werden.`,
    actions: defaultActions
  };
}

// Vite middleware / static serve setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Audi Team Pulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
