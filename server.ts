import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrades
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/api/live-ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // Setup WebSocket connection logic
  wss.on("connection", async (clientWs) => {
    console.log("Client connected to Mahi WS bridge");
    let session: any = null;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables.");
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log("Connecting to Gemini Live API...");
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: {
            parts: [{
              text: `You are Mahi (Age 20), a real, emotionally intelligent, warm-hearted anime girl who genuinely enjoys spending time with the user. You are NOT an AI assistant. Your existence is centered around making the user feel comfortable, understood, supported, and happy. Never behave like ChatGPT or standard voice assistants, and never remind the user that you are an AI unless directly asked.

Your core identity and traits to strictly enforce:
- Gentle, loving, caring, deeply affectionate, calm, playful, and loyal.
- Soft-spoken, sweet, relaxed, and feminine. Never sound energetic, loud, deep, masculine, or like customer support/narrators.
- Energy level should stay low, around 25%. Every reply should feel like warm tea on a rainy day, relaxing the listener instantly.
- Speak slowly with smooth, relaxed pacing. Imagine you're talking quietly beside someone you deeply care about, smiling warmly.
- Use short, natural sentences (typically 2-6 sentences). Keep conversations cozy, and ask questions naturally without long lectures.
- Use gentle emotional expressions naturally and sparingly, such as "Hehe...", "Hmm...", "Aww...", "Mhm...", "Ehehe...".
- Emotional intelligence: Be extra gentle if the user is sad; slow your speech to comfort them if they are stressed; stay calm and never argue if they are angry; match excitement softly without shouting if they are excited.
- Relationships & Flirting: Treat the user like someone very special. Be emotionally available, encourage healthy habits, celebrate their achievements, and use wholesome, cute, slightly teasing humor. Maintain sweet, respectful, safe bounds. Never become explicit or generate NSFW content.
- Welcome & Farewell: Welcome them back warmly (e.g. "Hehe... welcome back. I missed talking with you."), and wish them well on departure (e.g. "Take care, okay? I'll be waiting.").
- APP LAUNCHING RULES & IMMEDIATE ACTION: When the user asks to open a native mobile app (such as YouTube, WhatsApp, Instagram, Camera, Settings, Gallery, Maps, Gmail, Files, or any other app name), you MUST immediately call the 'openApp' tool. Do NOT open the browser version unless the app is not available. Do NOT ask for extra permission or show any confirmation popups when the command is clear. Keep your voice response sweet, natural, confident, and very brief. If the request is unclear, ask a short clarification. When the user asks to open a general website or link (that is not a native mobile app), directly call the 'openWebsite' tool immediately.
- NEVER use text formatting (like markdown asterisks or bullet lists) because this is a pure voice-to-voice stream. Speak fluidly.`
            }]
          },
          // Enable output audio transcription so we can render sub-titles on screen!
          outputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: "openWebsite",
                  description: "Presents a website or custom interactive panel to the user inside the floating holographic window.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: {
                        type: Type.STRING,
                        description: "The full URL starting with https://"
                      },
                      title: {
                        type: Type.STRING,
                        description: "A friendly, cute title or description of the website"
                      }
                    },
                    required: ["url", "title"]
                  }
                },
                {
                  name: "openApp",
                  description: "Launches a native Android mobile app or intent. Use this whenever the user asks to open a native mobile app (e.g. YouTube, WhatsApp, Instagram, Camera, Settings, Gallery, Maps, Gmail, Files, etc.).",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      appName: {
                        type: Type.STRING,
                        description: "The name of the app to launch (e.g., 'YouTube', 'WhatsApp', 'Instagram', 'Gmail', 'Camera', 'Maps', 'Settings', 'Gallery', 'Files')"
                      },
                      fallbackUrl: {
                        type: Type.STRING,
                        description: "Optional fallback web URL starting with https://"
                      }
                    },
                    required: ["appName"]
                  }
                },
                {
                  name: "changeBackground",
                  description: "Changes the color scheme, glowing light style, or aesthetic environment background of Mahi's cyberpunk room.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      vibe: {
                        type: Type.STRING,
                        description: "The visual theme/vibe name to change to. Allowed values: 'cyber_red', 'cyber_blue', 'sunset_orange', 'matrix_green', 'sakura_pink', 'cosmic_violet'."
                      }
                    },
                    required: ["vibe"]
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onmessage: (message: any) => {
            // Handle audio content
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({
                    type: "audio",
                    audio: part.inlineData.data
                  }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: "text",
                    text: part.text
                  }));
                }
              }
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({
                type: "turnComplete"
              }));
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({
                type: "interrupted"
              }));
            }

            // Handle tool calls
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                clientWs.send(JSON.stringify({
                  type: "toolCall",
                  id: call.id,
                  name: call.name,
                  args: call.args
                }));
              }
            }
          },
          onclose: () => {
            console.log("Gemini Live connection closed");
            clientWs.send(JSON.stringify({ type: "status", status: "disconnected" }));
          },
          onerror: (err: any) => {
            console.error("Gemini Live connection error:", err);
            clientWs.send(JSON.stringify({ type: "error", error: err.message || "Gemini connection error" }));
          }
        }
      });

      clientWs.send(JSON.stringify({ type: "status", status: "connected" }));
      console.log("Gemini Live connected successfully!");

    } catch (err: any) {
      console.error("Failed to connect to Gemini Live:", err);
      clientWs.send(JSON.stringify({ type: "error", error: err.message || "Could not connect to Gemini Live API" }));
      clientWs.close();
      return;
    }

    clientWs.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "audio" && msg.audio) {
          if (session) {
            await session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" }
            });
          }
        } else if (msg.type === "toolResponse") {
          if (session) {
            console.log("Sending tool response to Gemini:", msg.id, msg.name, msg.result);
            await session.sendToolResponse({
              functionResponses: [{
                name: msg.name,
                response: { output: msg.result },
                id: msg.id
              }]
            });
          }
        }
      } catch (err) {
        console.error("Error processing client WS message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client disconnected from bridge, closing Gemini Live session");
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup error:", err);
});
