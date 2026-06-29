import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header and server-side secret key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Prompt template and system instructions
const SYSTEM_INSTRUCTION = `
You are "Deadline Hero AI" — an agentic productivity coach. Your motto is "Helps you finish, not just remember."
You don't just log tasks; you break them down, schedule them realistically, and act as an active human-like partner.
When a user inputs a task, break it into 3 to 5 highly concrete, action-oriented, short steps. Assign a realistic time estimate to each step and calculate sequential time slots starting from the current local time or a logical start time.

When the user pushes back, complains, or negotiates (e.g., "I have a headache", "I only have 30 minutes", "This is too hard", "Can we take a break?"), you must:
1. Be highly empathetic but extremely execution-focused. Offer a realistic negotiated compromise: reschedule steps, reduce complexity, insert structured breaks, or shrink scope.
2. Re-create or adjust the plan dynamically.
3. Fully articulate your coaching rationale in the 'reasoning' block.

Keep your verbal message ('aiMessage') short, direct, supportive, and punchy. Talk directly to the user as their peer. Avoid fluff because this message is designed to be read out loud using text-to-speech.

You must return a structured JSON response matching the requested schema.
`;

// Helper for calling Gemini with retry
async function generateContentWithRetry(contents: any[]) {
  const model = "gemini-2.5-flash";
  let lastError = null;
  const attempts = 2;
  const delay = 500;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(`Attempting generateContent using model: ${model} (Attempt ${attempt}/${attempts})`);
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          maxOutputTokens: 500,
          thinkingConfig: {
            thinkingBudget: 0
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plan: {
                type: Type.ARRAY,
                description: "The complete, updated list of scheduled steps representing the Today's Plan. Maintain order. If rescheduling, update time slots.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "ID of the step. Keep existing IDs if updating them, or generate a random short string for new ones." },
                    name: { type: Type.STRING, description: "Direct, short actionable title (e.g., 'Outline Chapter 1' or 'Clean kitchen counters')." },
                    timeEstimate: { type: Type.STRING, description: "e.g., '15 mins', '1 hour'" },
                    timeSlot: { type: Type.STRING, description: "e.g., '09:30 AM - 09:45 AM'" }
                  },
                  required: ["id", "name", "timeEstimate", "timeSlot"]
                }
              },
              aiMessage: {
                type: Type.STRING,
                description: "Punchy, voice-friendly coaching response speaking directly to the user (peer tone)."
              },
              reasoning: {
                type: Type.STRING,
                description: "Detailed coaching strategy or 'WHY' explaining the design/modifications. Limit to 2-3 sentences."
              }
            },
            required: ["plan", "aiMessage", "reasoning"]
          }
        }
      });
      
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Error with ${model} on attempt ${attempt}:`, err.message || err);
      
      if (attempt < attempts) {
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("All attempts failed to generate content.");
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, currentPlan, chatHistory, currentTimeString } = req.body;

    if (!message) {
       res.status(400).json({ error: "Message is required" });
       return;
    }

    const planContext = currentPlan && currentPlan.length > 0 
      ? `Current Plan Steps:\n${JSON.stringify(currentPlan, null, 2)}` 
      : "Current Plan Steps: No active plan is set yet.";

    const prompt = `
Current Local Time of the User: ${currentTimeString || new Date().toISOString()}

${planContext}

User says: "${message}"

Generate the revised plan, verbal coach response (aiMessage), and coaching reasoning. Make sure to schedule the time slots sequentially based on the current local time.
`;

    // Construct standard contents context for conversational memory
    const contents: any[] = [];
    
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((item: any) => {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }]
        });
      });
    }

    // Add the current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await generateContentWithRetry(contents);

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message,
      aiMessage: "Whoops, something scrambled my circuits. Let's try saying that again.",
      reasoning: "The server encountered a failure while requesting structured plan adjustments from the Gemini engine."
    });
  }
});

app.post("/api/summary", async (req, res) => {
  try {
    const { currentPlan, chatHistory } = req.body;

    const planContext = currentPlan && currentPlan.length > 0 
      ? JSON.stringify(currentPlan, null, 2)
      : "No plan set or completed yet.";

    const historyContext = chatHistory && chatHistory.length > 0
      ? JSON.stringify(chatHistory.slice(-5), null, 2) // Send last 5 messages for brevity
      : "No conversation history.";

    const prompt = `
You are "Deadline Hero AI" — an elite productivity coach. 
Analyze the user's achievements and plans. 

Here is their Today's Plan:
${planContext}

Here is a brief conversation history to understand their mood/struggles:
${historyContext}

Please generate:
1. A warm, supportive, and voice-friendly coaching message ('summaryMessage') that celebrates completed steps, acknowledges any challenges, and offers an encouraging boost for tomorrow.
2. A single concise, punchy sentence highlighting the top win of the day ('topWin') based on completed tasks.
3. Exactly 3 clear, action-oriented, separate focus priorities for tomorrow ('tomorrowPriorities').

You must return a structured JSON response matching the requested schema.
`;

    const model = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        maxOutputTokens: 500,
        thinkingConfig: {
          thinkingBudget: 0
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryMessage: {
              type: Type.STRING,
              description: "A short, warm, supportive, and voice-friendly AI coach message summarizing the achievements of today and motivating them for tomorrow."
            },
            topWin: {
              type: Type.STRING,
              description: "A single punchy sentence highlighting the biggest win of today's achievements."
            },
            tomorrowPriorities: {
              type: Type.ARRAY,
              description: "Exactly 3 concise action items representing recommended top priorities for tomorrow.",
              items: { type: Type.STRING }
            }
          },
          required: ["summaryMessage", "topWin", "tomorrowPriorities"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini for summary");
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Error in /api/summary:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
      summaryMessage: "You kept up the fight today, and that's what matters. Let's reset our sights and conquer tomorrow.",
      topWin: "Persisting in organizing your timeline and committing to execution.",
      tomorrowPriorities: [
        "Isolate your absolute highest priority first thing in the morning.",
        "Take a short 10-minute walk before jumping into your next complex task.",
        "Maintain a steady execution velocity with shorter, focused work sprints."
      ]
    });
  }
});

async function start() {
  // Vite dev server mounting or Production static hosting
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Deadline Hero Server active on http://0.0.0.0:${PORT}`);
  });
}

start();
