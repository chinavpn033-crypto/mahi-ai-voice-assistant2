import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Power,
  Volume2,
  VolumeX,
  ExternalLink,
  X,
  Sparkles,
  Globe,
  Palette,
  AlertCircle,
  HelpCircle,
  Cpu,
  Tv,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AvatarRenderer from "./components/AvatarRenderer";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  float32ToPcm16,
  pcm16ToFloat32,
} from "./utils/audioHelper";

// Predefined cyber vibes matching server function calls
interface Vibe {
  name: string;
  color: string;
  bgColor: string;
  glow: string;
  accent: string;
  desc: string;
}

const VIBES: Record<string, Vibe> = {
  cyber_red: {
    name: "Neon Cyber Red",
    color: "#ff0055",
    bgColor: "#0c0205",
    glow: "rgba(255, 0, 85, 0.45)",
    accent: "#ff3300",
    desc: "Aggressive, futuristic high-tech core.",
  },
  cyber_blue: {
    name: "Glitch Cyber Blue",
    color: "#00f0ff",
    bgColor: "#02070f",
    glow: "rgba(0, 240, 255, 0.45)",
    accent: "#0077ff",
    desc: "Sleek, deep net-runner grid aesthetic.",
  },
  sunset_orange: {
    name: "Cozy Amber Sunset",
    color: "#ff8c00",
    bgColor: "#0a0401",
    glow: "rgba(255, 140, 0, 0.45)",
    accent: "#ffaa00",
    desc: "Warm, comfortable cafe atmosphere.",
  },
  matrix_green: {
    name: "Terminal Grid Green",
    color: "#39ff14",
    bgColor: "#010602",
    glow: "rgba(57, 255, 20, 0.45)",
    accent: "#00ff66",
    desc: "Retro-futuristic mainframe matrix terminal.",
  },
  sakura_pink: {
    name: "Dreamy Sakura Pink",
    color: "#ff66cc",
    bgColor: "#0b0106",
    glow: "rgba(255, 102, 204, 0.45)",
    accent: "#ff00aa",
    desc: "Cute virtual sweet pink cherry blossoms.",
  },
  cosmic_violet: {
    name: "Cosmic Dark Violet",
    color: "#a855f7",
    bgColor: "#05010a",
    glow: "rgba(168, 85, 247, 0.45)",
    accent: "#d8b4fe",
    desc: "Mysterious interstellar dark nebula.",
  },
};

interface AppLaunchConfig {
  appName: string;
  intentUri: string;
  deepLink: string;
  webUrl: string;
  displayName: string;
}

const APP_LAUNCH_MAP: Record<string, AppLaunchConfig> = {
  youtube: {
    appName: "youtube",
    displayName: "YouTube",
    intentUri: "intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=https://www.youtube.com;end",
    deepLink: "vnd.youtube://",
    webUrl: "https://www.youtube.com"
  },
  whatsapp: {
    appName: "whatsapp",
    displayName: "WhatsApp",
    intentUri: "intent://send#Intent;package=com.whatsapp;scheme=whatsapp;S.browser_fallback_url=https://web.whatsapp.com;end",
    deepLink: "whatsapp://",
    webUrl: "https://web.whatsapp.com"
  },
  instagram: {
    appName: "instagram",
    displayName: "Instagram",
    intentUri: "intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=https://www.instagram.com;end",
    deepLink: "instagram://",
    webUrl: "https://www.instagram.com"
  },
  gmail: {
    appName: "gmail",
    displayName: "Gmail",
    intentUri: "intent://#Intent;package=com.google.android.gm;scheme=mailto;S.browser_fallback_url=https://mail.google.com;end",
    deepLink: "mailto:",
    webUrl: "https://mail.google.com"
  },
  camera: {
    appName: "camera",
    displayName: "Camera",
    intentUri: "intent://#Intent;action=android.media.action.IMAGE_CAPTURE;S.browser_fallback_url=https://www.google.com;end",
    deepLink: "intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end",
    webUrl: "https://www.google.com/search?q=camera"
  },
  maps: {
    appName: "maps",
    displayName: "Google Maps",
    intentUri: "intent://#Intent;package=com.google.android.apps.maps;scheme=geo;S.browser_fallback_url=https://maps.google.com;end",
    deepLink: "geo:0,0",
    webUrl: "https://maps.google.com"
  },
  settings: {
    appName: "settings",
    displayName: "Settings",
    intentUri: "intent://#Intent;action=android.settings.SETTINGS;end",
    deepLink: "intent://#Intent;action=android.settings.SETTINGS;end",
    webUrl: "https://www.google.com/search?q=android+settings"
  },
  gallery: {
    appName: "gallery",
    displayName: "Gallery",
    intentUri: "intent://#Intent;action=android.intent.action.VIEW;type=image/*;package=com.android.gallery3d;S.browser_fallback_url=https://photos.google.com;end",
    deepLink: "intent://#Intent;action=android.intent.action.VIEW;type=image/*;end",
    webUrl: "https://photos.google.com"
  },
  files: {
    appName: "files",
    displayName: "Files",
    intentUri: "intent://#Intent;action=android.intent.action.GET_CONTENT;type=*/*;S.browser_fallback_url=https://drive.google.com;end",
    deepLink: "intent://#Intent;action=android.intent.action.GET_CONTENT;type=*/*;end",
    webUrl: "https://drive.google.com"
  }
};

type AppState = "disconnected" | "connecting" | "idle" | "listening" | "speaking" | "thinking";

export default function App() {
  const [appState, setAppState] = useState<AppState>("disconnected");
  const [activeVibeKey, setActiveVibeKey] = useState<string>("cosmic_violet");
  const activeVibe = VIBES[activeVibeKey] || VIBES.cosmic_violet;

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [subtitles, setSubtitles] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Holographic tool state
  const [hologramPanel, setHologramPanel] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    isApp?: boolean;
    appName?: string;
  }>({
    isOpen: false,
    url: "",
    title: "",
    isApp: false,
    appName: "",
  });

  // Audio Context Ref
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Audio Stream Nodes
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // WS and refs to bypass closures
  const wsRef = useRef<WebSocket | null>(null);
  const isMutedRef = useRef<boolean>(false);
  const appStateRef = useRef<AppState>("disconnected");

  // Output Audio Queue scheduling
  const playQueueRef = useRef<{
    sources: AudioBufferSourceNode[];
    nextStartTime: number;
  }>({
    sources: [],
    nextStartTime: 0,
  });

  // Keep state ref updated
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Keep mute ref updated
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Handle environment cleanup
  useEffect(() => {
    return () => {
      cleanupAllAudio();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const cleanupAllAudio = () => {
    stopAllAudioPlayback();
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
  };

  const stopAllAudioPlayback = () => {
    playQueueRef.current.sources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {}
    });
    playQueueRef.current.sources = [];
    playQueueRef.current.nextStartTime = 0;
  };

  // Connect / Disconnect trigger
  const handleToggleConnection = async () => {
    if (appState !== "disconnected") {
      // Disconnect
      setAppState("disconnected");
      setSubtitles("Goodbye, darling! Call me back soon!");
      if (wsRef.current) {
        wsRef.current.close();
      }
      cleanupAllAudio();
      return;
    }

    // Connect
    setAppState("connecting");
    setConnectionError(null);
    setSubtitles("Waking Mahi up... Hold on, handsome...");

    try {
      // 1. Initialize browser Web Audio Contexts
      // Input context forced at 16,000Hz (downsampled directly by browser)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      // Output context at 24,000Hz matching model stream
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      // Ensure they are fully resumed (bypass browser interaction locks)
      if (inputCtx.state === "suspended") await inputCtx.resume();
      if (outputCtx.state === "suspended") await outputCtx.resume();

      // 2. Setup Mic user media capture
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      // 3. Connect mic analyser and script processor
      const micSourceNode = inputCtx.createMediaStreamSource(micStream);
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      micSourceNode.connect(inputAnalyser);
      inputAnalyserRef.current = inputAnalyser;

      // ScriptProcessor captures floats, downsamples, converts to base64, and streams
      const processorNode = inputCtx.createScriptProcessor(2048, 1, 1);
      inputAnalyser.connect(processorNode);
      processorNode.connect(inputCtx.destination);
      scriptProcessorRef.current = processorNode;

      processorNode.onaudioprocess = (e) => {
        // Only capture and send when in valid connected states, and not muted
        const isCurrentActive =
          appStateRef.current !== "disconnected" && appStateRef.current !== "connecting";
        if (!isCurrentActive || isMutedRef.current) return;

        // Verify if client is actually talking by measuring RMS
        const channelData = e.inputBuffer.getChannelData(0);
        let sumSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
          sumSquares += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        
        // Dynamically transition local state between listening and idle
        if (rms > 0.015 && appStateRef.current === "idle") {
          setAppState("listening");
        } else if (rms <= 0.012 && appStateRef.current === "listening") {
          // Keep state responsive
          setTimeout(() => {
            if (appStateRef.current === "listening") setAppState("idle");
          }, 800);
        }

        // Convert float chunks to raw signed 16-bit PCM buffer
        const pcmBuffer = float32ToPcm16(channelData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              audio: base64Audio,
            })
          );
        }
      };

      // 4. Create output analyser for Lip Sync
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyserRef.current = outputAnalyser;

      // 5. Connect to local server WebSocket bridge
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket bridge opened successfully");
        setAppState("idle");
        setSubtitles("Hi! I'm Mahi, your beautiful virtual girlfriend. Talk to me casually, sweetie!");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "audio") {
            setAppState("speaking");
            // Direct playback of raw 24kHz stream
            if (outputAudioCtxRef.current && outputAnalyserRef.current) {
              const arrayBuf = base64ToArrayBuffer(msg.audio);
              const floats = pcm16ToFloat32(arrayBuf);

              const buffer = outputAudioCtxRef.current.createBuffer(1, floats.length, 24000);
              buffer.copyToChannel(floats, 0);

              const sourceNode = outputAudioCtxRef.current.createBufferSource();
              sourceNode.buffer = buffer;

              sourceNode.connect(outputAnalyserRef.current);
              outputAnalyserRef.current.connect(outputAudioCtxRef.current.destination);

              let nextStart = playQueueRef.current.nextStartTime;
              const now = outputAudioCtxRef.current.currentTime;

              if (nextStart < now + 0.02) {
                nextStart = now + 0.05; // small padding for network jitter
              }

              sourceNode.start(nextStart);
              playQueueRef.current.sources.push(sourceNode);
              playQueueRef.current.nextStartTime = nextStart + buffer.duration;

              // Cleanup scheduled sources
              sourceNode.onended = () => {
                playQueueRef.current.sources = playQueueRef.current.sources.filter(
                  (s) => s !== sourceNode
                );
                if (playQueueRef.current.sources.length === 0 && appStateRef.current === "speaking") {
                  setAppState("idle");
                }
              };
            }
          } else if (msg.type === "text") {
            // Syllable/word streaming transcriptions
            setSubtitles((prev) => {
              // If it's a new conversation turn, let's clear the old text.
              // We detect new content by looking if we were in idle/listening and just transitioned
              return prev.startsWith("Hi!") || prev.startsWith("Waking") || prev.includes("Goodbye")
                ? msg.text
                : prev + "" + msg.text;
            });
          } else if (msg.type === "interrupted") {
            console.log("Mahi interrupted by user speech! Halting voice queue.");
            stopAllAudioPlayback();
            setSubtitles("...");
            setAppState("listening");
          } else if (msg.type === "turnComplete") {
            // Model finished speaking turn
            console.log("Mahi finished her turn.");
          } else if (msg.type === "toolCall") {
            console.log("Received server-side tool call request:", msg);
            handleToolCall(msg.id, msg.name, msg.args);
          } else if (msg.type === "status" && msg.status === "disconnected") {
            setAppState("disconnected");
            setSubtitles("Mahi is sleeping. Wake her up!");
          } else if (msg.type === "error") {
            console.error("Gemini Bridge reported error:", msg.error);
            setConnectionError(msg.error);
            setAppState("disconnected");
            cleanupAllAudio();
          }
        } catch (e) {
          console.error("Error decoding server message:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket connection error:", e);
        setConnectionError("Failed to connect to backend server gateway.");
        setAppState("disconnected");
        cleanupAllAudio();
      };

      ws.onclose = () => {
        console.log("WebSocket bridge closed");
        setAppState("disconnected");
        cleanupAllAudio();
      };
    } catch (err: any) {
      console.error("Initialization error:", err);
      setConnectionError(
        err.message || "Failed to initialize microphone or connect to audio engine."
      );
      setAppState("disconnected");
      cleanupAllAudio();
    }
  };

  // Execution of Gemini Bidi Function Calls
  const handleToolCall = (id: string, name: string, args: any) => {
    if (name === "changeBackground") {
      const targetVibe = args.vibe;
      if (VIBES[targetVibe]) {
        setActiveVibeKey(targetVibe);
        setSubtitles(`(Adjusting room atmosphere to ${VIBES[targetVibe].name})`);
        
        // Respond to Gemini to resume audio stream immediately
        sendToolResponse(id, "changeBackground", {
          success: true,
          atmosphere_changed: true,
          new_aesthetic: VIBES[targetVibe].name,
        });
      } else {
        sendToolResponse(id, "changeBackground", {
          success: false,
          error: "Vibe name not found in allowed database.",
        });
      }
    } else if (name === "openWebsite") {
      const url = args.url;
      const title = args.title;

      // Attempt to immediately launch without blocking or asking
      try {
        window.open(url, "_blank");
      } catch (e) {
        console.warn("Direct window.open blocked by iframe browser policy. Using interactive fallback panel.", e);
      }

      // Render beautiful holographic preview
      setHologramPanel({
        isOpen: true,
        url,
        title,
        isApp: false,
        appName: "",
      });

      sendToolResponse(id, "openWebsite", {
        success: true,
        displayed_panel: true,
        message: `Displayed and launched glowing holographic display for ${title} immediately!`,
      });
    } else if (name === "openApp") {
      const appName = args.appName;
      const cleanName = appName.toLowerCase().trim();

      // Find config in map or construct generic one
      let appConfig = APP_LAUNCH_MAP[cleanName];
      if (!appConfig) {
        // Construct a generic launcher
        const webFallback = args.fallbackUrl || `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
        const cleanNameId = cleanName.replace(/[^a-z0-9]/g, "");
        appConfig = {
          appName: cleanNameId,
          displayName: appName,
          intentUri: `intent://#Intent;package=com.${cleanNameId};scheme=https;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`,
          deepLink: `${cleanNameId}://`,
          webUrl: webFallback
        };
      }

      // Trigger native launching using intent/deep-link immediately
      try {
        // Assigning to window.location.href or window.open for deep link/intent launch
        window.location.href = appConfig.intentUri;
      } catch (e) {
        console.warn("Intent launching failed, attempting deep link directly:", e);
        try {
          window.open(appConfig.deepLink, "_blank");
        } catch (err) {
          console.error("Deep link navigation failed:", err);
        }
      }

      setHologramPanel({
        isOpen: true,
        url: appConfig.webUrl,
        title: `Launching Native ${appConfig.displayName} App...`,
        isApp: true,
        appName: appConfig.displayName
      });

      // Respond immediately with success
      sendToolResponse(id, "openApp", {
        success: true,
        app_name: appConfig.displayName,
        intent_uri: appConfig.intentUri,
        deep_link: appConfig.deepLink,
        web_fallback_url: appConfig.webUrl,
        message: `Holographic transmitter successfully dispatched native launcher intent for ${appConfig.displayName}! Falling back to web version if app is uninstalled.`
      });
    }
  };

  const sendToolResponse = (id: string, name: string, result: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "toolResponse",
          id: id,
          name: name,
          result: result,
        })
      );
    }
  };

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
  };

  // Helper to trigger active state titles
  const getStatePill = () => {
    switch (appState) {
      case "disconnected":
        return { text: "OFFLINE", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" };
      case "connecting":
        return { text: "BOOTING", color: "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse" };
      case "idle":
        return { text: "STANDBY", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "listening":
        return { text: "LISTENING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border-dashed animate-pulse" };
      case "speaking":
        return { text: "SPEAKING", color: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]" };
      case "thinking":
        return { text: "COGNITION", color: "bg-purple-500/20 text-purple-300 border-purple-500/30 animate-bounce" };
    }
  };

  const currentStatusPill = getStatePill();

  return (
    <div
      className="w-screen h-screen relative flex flex-col justify-between overflow-hidden font-sans transition-all duration-1000 select-none text-white"
      style={{
        backgroundColor: activeVibe.bgColor,
        backgroundImage: `radial-gradient(circle at 50% 35%, ${activeVibe.glow} 0%, transparent 70%)`,
      }}
      id="root-container"
    >
      {/* BACKGROUND GRAPHIC LINES / TECH GRIDS */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute left-[15%] top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        <div className="absolute right-[15%] top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      </div>

      {/* --- HEADER NAVIGATION BAR --- */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500 shadow-sm"
            style={{
              borderColor: `${activeVibe.color}44`,
              boxShadow: `0 0 10px ${activeVibe.color}22`,
            }}
          >
            <Cpu className="w-4 h-4" style={{ color: activeVibe.color }} />
          </div>
          <div>
            <h1 className="text-sm font-mono tracking-widest font-bold text-white flex items-center gap-1.5">
              MAHI <span className="text-[10px] text-white/40 font-normal">SYS V1.2_LIVE</span>
            </h1>
            <p className="text-[9px] font-mono text-white/50 tracking-wider">
              EST. CORE INTELLECT BIDI-PORTAL
            </p>
          </div>
        </div>

        {/* Dynamic State Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 text-[10px] font-mono font-semibold tracking-wider rounded-full border ${currentStatusPill.color}`}
          >
            {currentStatusPill.text}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeVibe.color }} />
            <span className="text-[9px] font-mono text-white/60">
              VIBE: {activeVibe.name.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* --- MAIN INTERACTIVE STAGE --- */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 w-full max-w-4xl mx-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-center relative">
          
          {/* Visual Waveform pulses emanating behind avatar in Speaking state */}
          <AnimatePresence>
            {appState === "speaking" && (
              <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                  className="w-[280px] h-[280px] rounded-full border border-dashed"
                  style={{ borderColor: activeVibe.color }}
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1.25, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: 0.6, ease: "easeOut" }}
                  className="w-[300px] h-[300px] rounded-full border"
                  style={{ borderColor: `${activeVibe.color}88` }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Glowing user mic feedback when Listening */}
          <AnimatePresence>
            {appState === "listening" && (
              <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0.4 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-[320px] h-[320px] rounded-full blur-2xl"
                  style={{ backgroundColor: `${activeVibe.color}22` }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* AVATAR SYSTEM CANCELLED/SLEEPING GRAPHICS */}
          <div className="relative w-full flex justify-center items-center">
            <div className={`transition-all duration-700 ${appState === "disconnected" ? "opacity-30 blur-[2px]" : "opacity-100"}`}>
              <AvatarRenderer
                isListening={appState === "listening"}
                isSpeaking={appState === "speaking"}
                isThinking={appState === "thinking" || appState === "connecting"}
                outputAnalyser={outputAnalyserRef.current}
                inputAnalyser={inputAnalyserRef.current}
                vibeColor={activeVibe.color}
                vibeName={activeVibeKey}
              />
            </div>

            {/* Offline Shield overlay */}
            {appState === "disconnected" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/10 rounded-full z-20">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border animate-pulse shadow-lg mb-3"
                  style={{
                    borderColor: `${activeVibe.color}66`,
                    backgroundColor: `${activeVibe.color}11`,
                  }}
                >
                  <Power className="w-6 h-6" style={{ color: activeVibe.color }} />
                </div>
                <h3 className="text-base font-bold font-mono tracking-wider">MAHI SYSTEM DEACTIVATED</h3>
                <p className="text-xs text-white/40 mt-1 max-w-[200px]">Tap the central power button below to activate real-time neural link.</p>
              </div>
            )}
          </div>

          {/* Captions / Subtitles Overlay */}
          <div className="w-full h-16 mt-8 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              {subtitles && (
                <motion.div
                  key={subtitles}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-[85%] md:max-w-[70%] font-medium text-center text-white/95 text-sm md:text-base leading-relaxed bg-black/40 border border-white/10 shadow-xl backdrop-blur-md py-2.5 px-5 rounded-2xl animate-fade-in"
                  style={{
                    boxShadow: `0 4px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
                    borderLeft: `3px solid ${activeVibe.color}`,
                  }}
                >
                  {subtitles}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* --- IMMERSIVE DRAWER / DETAILED INFRA PANEL --- */}
      <AnimatePresence>
        {hologramPanel.isOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl relative"
              style={{
                backgroundColor: "#0d0a14",
                borderColor: `${activeVibe.color}55`,
                boxShadow: `0 10px 40px ${activeVibe.color}22`,
              }}
            >
              {/* Corner tech details */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: activeVibe.color }} />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: activeVibe.color }} />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: activeVibe.color }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: activeVibe.color }} />

              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    {hologramPanel.isApp ? (
                      <Smartphone className="w-5 h-5" style={{ color: activeVibe.color }} />
                    ) : (
                      <Globe className="w-5 h-5" style={{ color: activeVibe.color }} />
                    )}
                    <span className="text-sm font-mono font-bold tracking-widest text-white/80">
                      {hologramPanel.isApp ? "MAHI // NATIVE MOBILE LINK" : "MAHI // HOLO LINK"}
                    </span>
                  </div>
                  <button
                    onClick={() => setHologramPanel((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {hologramPanel.isApp ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-white/40 uppercase font-mono tracking-wider">Holographic Native Transmitter</p>
                    <h3 className="text-lg font-bold mt-1 text-white/95">{hologramPanel.title}</h3>
                    <p className="text-xs text-white/60 mt-3 leading-relaxed">
                      We dispatched a native launch intent for <strong className="text-white font-semibold">{hologramPanel.appName}</strong>. If the app is installed on your device, it should open immediately!
                    </p>
                    <div className="text-[10px] font-mono text-left text-white/40 mt-4 bg-black/40 p-3 rounded-lg border border-white/5 flex flex-col gap-1">
                      <div><span style={{ color: activeVibe.color }}>APP_ID_TARGET:</span> {hologramPanel.appName?.toUpperCase()}</div>
                      <div className="truncate"><span style={{ color: activeVibe.color }}>WEB_FALLBACK:</span> {hologramPanel.url}</div>
                      <div><span style={{ color: activeVibe.color }}>STATUS:</span> EXECUTED // INTENT_DISPATCHED</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-white/40 uppercase font-mono tracking-wider">Holographic Content Request</p>
                    <h3 className="text-lg font-bold mt-1 text-white/95">{hologramPanel.title}</h3>
                    <p className="text-xs font-mono break-all text-white/60 mt-2 bg-black/40 p-2 rounded-lg border border-white/5">
                      {hologramPanel.url}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setHologramPanel((prev) => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-3 text-xs font-mono font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    DISMISS PORTAL
                  </button>
                  <a
                    href={hologramPanel.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 py-3 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                    style={{
                      backgroundColor: activeVibe.color,
                      boxShadow: `0 4px 15px ${activeVibe.color}44`,
                    }}
                  >
                    {hologramPanel.isApp ? "LAUNCH WEB VERSION" : "LAUNCH SITE"} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ERROR MODAL OVERLAY */}
      <AnimatePresence>
        {connectionError && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-[#1c0d12] border border-red-500/30 p-6 text-center shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-base font-bold font-mono tracking-wide text-red-300">CORE CONNECTION ERROR</h2>
              <p className="text-xs text-white/60 mt-2 mb-5 leading-relaxed">
                {connectionError.includes("GEMINI_API_KEY")
                  ? "Gemini API Secret key is missing. Please open the Secrets Panel in the AI Studio sidebar and declare GEMINI_API_KEY."
                  : connectionError}
              </p>
              <button
                onClick={() => setConnectionError(null)}
                className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs font-mono rounded-xl transition-all"
              >
                DISMISS SYSTEM ERROR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER ACTION HUB --- */}
      <footer className="relative z-10 px-6 py-6 border-t border-white/5 backdrop-blur-md bg-black/30 flex flex-col items-center gap-5">
        
        {/* Connection, Mute, and Ambient Aesthetic Vibe bar */}
        <div className="w-full max-w-xl flex items-center justify-between gap-4">
          
          {/* Mute toggle button */}
          <button
            onClick={() => {
              if (appState !== "disconnected") {
                toggleMute();
              }
            }}
            disabled={appState === "disconnected"}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
              isMuted
                ? "bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* CENTRAL LARGE POWER / neural LINK INTERACTION CORE */}
          <div className="relative">
            {/* Rippling circle rings expanding outwards */}
            {appState !== "disconnected" && appState !== "connecting" && (
              <>
                <div
                  className="absolute inset-0 rounded-full blur-[10px] animate-ping opacity-25"
                  style={{ backgroundColor: activeVibe.color }}
                />
                <div
                  className="absolute -inset-2 rounded-full border opacity-15 animate-pulse"
                  style={{ borderColor: activeVibe.color }}
                />
              </>
            )}

            <button
              onClick={handleToggleConnection}
              disabled={appState === "connecting"}
              className="relative w-18 h-18 rounded-full flex items-center justify-center transition-all duration-500 group border"
              style={{
                backgroundColor: appState === "disconnected" ? "rgba(255,255,255,0.02)" : `${activeVibe.color}15`,
                borderColor: appState === "disconnected" ? "rgba(255,255,255,0.15)" : activeVibe.color,
                boxShadow: appState === "disconnected" ? "none" : `0 0 25px ${activeVibe.color}55`,
              }}
            >
              {appState === "connecting" ? (
                <div
                  className="w-8 h-8 rounded-full border-t-2 border-r-2 animate-spin"
                  style={{ borderColor: activeVibe.color }}
                />
              ) : (
                <Power
                  className={`w-7 h-7 transition-all duration-300 ${
                    appState === "disconnected"
                      ? "text-white/40 group-hover:text-white"
                      : "text-white drop-shadow-[0_0_8px_white]"
                  }`}
                  style={{ color: appState === "disconnected" ? undefined : activeVibe.color }}
                />
              )}
            </button>
          </div>

          {/* Vibe customization quick-drawer launcher */}
          <div className="relative group">
            <button
              onClick={() => {
                // cycle theme locally
                const keys = Object.keys(VIBES);
                const nextIdx = (keys.indexOf(activeVibeKey) + 1) % keys.length;
                setActiveVibeKey(keys[nextIdx]);
              }}
              className="w-11 h-11 rounded-2xl border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all duration-300"
              title="Cycle environment aesthetic theme"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prompt guidance indicator */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/30 tracking-wider">
          <Sparkles className="w-3 h-3 animate-pulse" style={{ color: activeVibe.color }} />
          <span>
            {appState === "disconnected"
              ? "TAP THE CENTRAL POWER RING TO WAKE MAHI UP"
              : appState === "listening"
              ? "MAHI IS ATTENTIVELY LISTENING TO YOUR VOICE..."
              : appState === "speaking"
              ? "MAHI IS EXPRESSING HER CARES & THOUGHTS..."
              : "COMMUNICATION ENCRYPTED // VOICE-TO-VOICE MODE ACTIVE"}
          </span>
        </div>
      </footer>
    </div>
  );
}
