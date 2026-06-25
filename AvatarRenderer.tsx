import React, { useRef, useEffect } from "react";

interface AvatarRendererProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  outputAnalyser: AnalyserNode | null;
  inputAnalyser: AnalyserNode | null;
  vibeColor: string;      // theme primary color hex (e.g. #ff007f)
  vibeName: string;       // theme name (e.g. 'cyber_red')
}

export default function AvatarRenderer({
  isListening,
  isSpeaking,
  isThinking,
  outputAnalyser,
  inputAnalyser,
  vibeColor,
  vibeName,
}: AvatarRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let blinkTimer = 0;
    let isBlinking = false;
    let blinkDuration = 0;
    let breathingTime = 0;
    let particleList: Array<{ x: number; y: number; size: number; speedY: number; alpha: number }> = [];

    // Initialize decorative ambient floating particles
    for (let i = 0; i < 30; i++) {
      particleList.push({
        x: Math.random() * 400,
        y: Math.random() * 400,
        size: Math.random() * 3 + 1,
        speedY: -(Math.random() * 0.5 + 0.2),
        alpha: Math.random() * 0.5 + 0.3,
      });
    }

    const draw = () => {
      if (!ctx || !canvas) return;

      // Real-time voice data extraction
      let mouthOpenScale = 0;
      if (isSpeaking && outputAnalyser) {
        const dataArray = new Uint8Array(outputAnalyser.frequencyBinCount);
        outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        mouthOpenScale = Math.min(1.0, avg / 45.0); // map volume sensitive to mouth
      }

      let micPulseScale = 0;
      if (isListening && inputAnalyser) {
        const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
        inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        micPulseScale = Math.min(1.0, avg / 45.0); // map volume sensitive to aura
      }

      // Handle high-DPI scaling
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      breathingTime += 0.03;
      const breathOffsetY = Math.sin(breathingTime) * 3; // Breathing sway
      const headBreathSway = Math.sin(breathingTime + 0.5) * 1.5;

      // Random Blinking state machine
      blinkTimer++;
      if (!isBlinking && blinkTimer > 180 + Math.random() * 120) {
        isBlinking = true;
        blinkTimer = 0;
        blinkDuration = 0;
      }
      if (isBlinking) {
        blinkDuration++;
        if (blinkDuration > 8) {
          isBlinking = false;
        }
      }

      const cx = width / 2;
      const cy = height / 2 + 10;

      // --- 1. AMBIENT BACKGROUND GLOW ---
      const bgGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 180);
      const glowAlpha = isListening ? 0.25 + micPulseScale * 0.25 : (isSpeaking ? 0.2 + mouthOpenScale * 0.2 : 0.15);
      bgGlow.addColorStop(0, `${vibeColor}${Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')}`);
      bgGlow.addColorStop(1, "transparent");
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 180, 0, Math.PI * 2);
      ctx.fill();

      // --- 2. HALO / NEON VISUALIZER RING BEHIND THE HEAD ---
      ctx.save();
      ctx.strokeStyle = `${vibeColor}88`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = vibeColor;
      
      const pulseRadius = 125 + (isSpeaking ? mouthOpenScale * 25 : 0) + (isListening ? micPulseScale * 20 : 0);
      ctx.beginPath();
      ctx.arc(cx, cy - 10, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw concentric tech notches on the visualizer ring
      ctx.strokeStyle = `${vibeColor}bb`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(cx, cy - 10, pulseRadius + 6, breathingTime * 0.1, breathingTime * 0.1 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // --- 3. FLOATING COMPANION PARTICLES ---
      ctx.save();
      particleList.forEach((p) => {
        p.y += p.speedY;
        if (p.y < 50) {
          p.y = height - 50;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = vibeColor;
        ctx.globalAlpha = p.alpha * (0.5 + Math.sin(breathingTime + p.x) * 0.3);
        ctx.shadowBlur = 4;
        ctx.shadowColor = vibeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // --- 4. BACK HAIR ---
      ctx.save();
      ctx.fillStyle = "#1e1b29"; // Dark base hair
      ctx.strokeStyle = `${vibeColor}aa`;
      ctx.lineWidth = 1;
      
      // Left back hair bundle
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy + 20);
      ctx.quadraticCurveTo(cx - 100 + headBreathSway, cy + 60, cx - 85, cy + 130 + breathOffsetY);
      ctx.quadraticCurveTo(cx - 65, cy + 100, cx - 40, cy + 50);
      ctx.fill();
      ctx.stroke();

      // Right back hair bundle
      ctx.beginPath();
      ctx.moveTo(cx + 50, cy + 20);
      ctx.quadraticCurveTo(cx + 100 - headBreathSway, cy + 60, cx + 85, cy + 130 + breathOffsetY);
      ctx.quadraticCurveTo(cx + 65, cy + 100, cx + 40, cy + 50);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- 5. SHOULDERS & NECK ---
      ctx.save();
      // Neck
      ctx.fillStyle = "#fde2e4"; // Pale cute skin tone
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + 25);
      ctx.lineTo(cx + 15, cy + 25);
      ctx.lineTo(cx + 12, cy + 60);
      ctx.lineTo(cx - 12, cy + 60);
      ctx.closePath();
      ctx.fill();

      // Cute neck collar / ribbon
      ctx.fillStyle = "#2d2a45";
      ctx.fillRect(cx - 13.5, cy + 35, 27, 5);
      // Collar gem / centerpiece pulsing
      ctx.fillStyle = vibeColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = vibeColor;
      ctx.beginPath();
      ctx.arc(cx, cy + 37.5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders/Outfit
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#2d2a45"; // Cyber jacket base
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + 55);
      ctx.bezierCurveTo(cx - 55, cy + 60, cx - 80, cy + 90, cx - 85, cy + 150 + breathOffsetY);
      ctx.lineTo(cx + 85, cy + 150 + breathOffsetY);
      ctx.bezierCurveTo(cx + 80, cy + 90, cx + 55, cy + 60, cx + 15, cy + 55);
      ctx.closePath();
      ctx.fill();

      // Cyber jacket neon piping details
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = vibeColor;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + 58);
      ctx.lineTo(cx - 45, cy + 150 + breathOffsetY);
      ctx.moveTo(cx + 15, cy + 58);
      ctx.lineTo(cx + 45, cy + 150 + breathOffsetY);
      ctx.stroke();
      ctx.restore();

      // --- 6. FACE BASE ---
      ctx.save();
      ctx.fillStyle = "#fff1f2"; // Rosy delicate skin tone
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy - 35);
      // Soft cheeks and rounded cute chin
      ctx.bezierCurveTo(cx - 45, cy + 15, cx - 35, cy + 30, cx, cy + 30 + headBreathSway * 0.2);
      ctx.bezierCurveTo(cx + 35, cy + 30, cx + 45, cy + 15, cx + 45, cy - 35);
      ctx.closePath();
      ctx.fill();

      // Cheeks Blush
      const leftBlush = ctx.createRadialGradient(cx - 28, cy + 8, 1, cx - 28, cy + 8, 12);
      leftBlush.addColorStop(0, "rgba(255, 182, 193, 0.6)");
      leftBlush.addColorStop(1, "transparent");
      ctx.fillStyle = leftBlush;
      ctx.beginPath();
      ctx.arc(cx - 28, cy + 8, 12, 0, Math.PI * 2);
      ctx.fill();

      const rightBlush = ctx.createRadialGradient(cx + 28, cy + 8, 1, cx + 28, cy + 8, 12);
      rightBlush.addColorStop(0, "rgba(255, 182, 193, 0.6)");
      rightBlush.addColorStop(1, "transparent");
      ctx.fillStyle = rightBlush;
      ctx.beginPath();
      ctx.arc(cx + 28, cy + 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- 7. EYES (BLINKING & RESPONSIVE) ---
      const eyeY = cy - 8;
      const eyeSpacing = 22;

      const drawEye = (isLeft: boolean) => {
        const xOffset = isLeft ? -eyeSpacing : eyeSpacing;
        const ex = cx + xOffset;
        const ey = eyeY;

        ctx.save();

        if (isBlinking) {
          // Closed eye: draw a beautiful thick anime eyelid curve
          ctx.strokeStyle = "#322d4a";
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(ex - 10, ey);
          ctx.quadraticCurveTo(ex, ey + 4, ex + 10, ey);
          ctx.stroke();
          ctx.restore();
          return;
        }

        // Active attention glowing indicators
        if (isListening) {
          // Soft attention circular rings pulsing behind the eyes
          const eyeRingRad = 15 + Math.sin(breathingTime * 4) * 2;
          ctx.strokeStyle = `${vibeColor}44`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ex, ey, eyeRingRad, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 7a. Eye White
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(ex, ey, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7b. Large beautiful Iris
        const irisGlow = ctx.createRadialGradient(ex, ey + 2, 2, ex, ey - 2, 9);
        irisGlow.addColorStop(0, `${vibeColor}`);
        irisGlow.addColorStop(0.6, "#2c1a30");
        irisGlow.addColorStop(1, "#170f21");
        ctx.fillStyle = irisGlow;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 7.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7c. Pupils with special shapes (Heart eyes if listening/speaking, or bright rings)
        ctx.fillStyle = "#0d0214";
        ctx.beginPath();
        ctx.ellipse(ex, ey + 1, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7d. Sparkles & Highlights (Anime eyes magic!)
        // Top-left main shine
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - 3, ey - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Bottom-right cute reflective spark
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        if (isListening) {
          // Hearts in her eyes when attentive!
          ctx.arc(ex + 3.5, ey + 3.5, 1.8, 0, Math.PI * 2);
        } else {
          ctx.arc(ex + 3, ey + 4, 1.3, 0, Math.PI * 2);
        }
        ctx.fill();

        // 7e. Eyelashes and upper lid
        ctx.strokeStyle = "#322d4a";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ex, ey - 1, 9.5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        // Small cute cat-eye wing
        ctx.fillStyle = "#322d4a";
        ctx.beginPath();
        ctx.moveTo(ex + (isLeft ? -9 : 9), ey - 5);
        ctx.lineTo(ex + (isLeft ? -13 : 13), ey - 8);
        ctx.lineTo(ex + (isLeft ? -8 : 8), ey - 2);
        ctx.closePath();
        ctx.fill();

        // 7f. Eyebrows (delicate, slightly curved)
        ctx.strokeStyle = "#4d3d54";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        // Leaned or excited look if thinking / listening
        const browOffset = isThinking ? -2 : 0;
        ctx.moveTo(ex - 10, ey - 14 + browOffset);
        ctx.quadraticCurveTo(ex, ey - 17 + (isListening ? -1 : 0), ex + 10, ey - 13 + browOffset);
        ctx.stroke();

        ctx.restore();
      };

      drawEye(true);  // Draw Left Eye
      drawEye(false); // Draw Right Eye

      // --- 8. MOUTH (LIP SYNC / EXPRESSIVE) ---
      const mouthX = cx;
      const mouthY = cy + 15;

      ctx.save();
      if (isSpeaking) {
        // Mouth opens dynamically according to mouthOpenScale
        const openH = Math.max(3, mouthOpenScale * 14); // Vertically modulated
        const openW = 8 + mouthOpenScale * 4;           // Horizontally modulated

        // Draw mouth inner depth
        ctx.fillStyle = "#e56b6f";
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, openW, openH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth outline
        ctx.strokeStyle = "#401625";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, openW, openH, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Tiny cute tongue
        ctx.fillStyle = "#ffb5a7";
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY + openH / 2, openW * 0.7, openH * 0.4, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      } else {
        // Idle mouth: cute, tiny anime smile
        ctx.strokeStyle = "#401625";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        if (isListening) {
          // Concentrating small rounded open 'o'
          ctx.arc(mouthX, mouthY + 1, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isThinking) {
          // Sarcastic or neutral straight line
          ctx.moveTo(mouthX - 4, mouthY);
          ctx.lineTo(mouthX + 4, mouthY);
          ctx.stroke();
        } else {
          // Lovely gentle smile
          ctx.moveTo(mouthX - 5, mouthY);
          ctx.quadraticCurveTo(mouthX, mouthY + 3.5, mouthX + 5, mouthY);
          ctx.stroke();
        }
      }
      ctx.restore();

      // --- 9. FRONT HAIR BANGS (OVERLAP CHEEKS & EYES) ---
      ctx.save();
      ctx.fillStyle = "#27223b"; // Beautiful dark plum/slate bangs
      ctx.strokeStyle = `${vibeColor}aa`;
      ctx.lineWidth = 1;

      // Draw beautiful dynamic overlapping strands
      const strands = [
        // Left strand framing side face
        { startX: cx - 45, cpX: cx - 55, endX: cx - 40, endY: cy + 18 },
        // Middle left bang
        { startX: cx - 35, cpX: cx - 25, endX: cx - 20, endY: cy - 2 },
        // Middle bang center-left
        { startX: cx - 22, cpX: cx - 12, endX: cx - 5, endY: cy - 6 },
        // Middle bang center-right
        { startX: cx - 8, cpX: cx + 2, endX: cx + 8, endY: cy - 4 },
        // Middle right bang
        { startX: cx + 5, cpX: cx + 20, endX: cx + 25, endY: cy - 3 },
        // Right strand framing side face
        { startX: cx + 40, cpX: cx + 55, endX: cx + 42, endY: cy + 18 },
      ];

      strands.forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s.startX, cy - 38);
        ctx.quadraticCurveTo(s.cpX + headBreathSway * 0.3, cy - 15, s.endX + headBreathSway * 0.2, s.endY);
        ctx.quadraticCurveTo(s.startX + 5, cy - 15, s.startX + 8, cy - 38);
        ctx.fill();
        ctx.stroke();
      });

      // Hair sheen highlight band across the bangs (Anime hair shine!)
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.moveTo(cx - 38, cy - 25);
      ctx.quadraticCurveTo(cx, cy - 21, cx + 38, cy - 25);
      ctx.quadraticCurveTo(cx, cy - 24, cx - 38, cy - 25);
      ctx.fill();
      ctx.restore();

      // --- 10. NEON HEADPHONES / CYBER GEAR (TOP & SIDES) ---
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = vibeColor;
      
      // Top headband connecting headphones
      ctx.strokeStyle = "#1b192b";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy - 30, 48, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Outer glow line for headband
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy - 30, 52, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      // Left headphone ear cup
      ctx.fillStyle = "#1b192b";
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx - 46, cy - 25, 9, 14, Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Left inner glow plate (pulsing)
      ctx.fillStyle = `${vibeColor}${isSpeaking ? 'cc' : '88'}`;
      ctx.beginPath();
      ctx.ellipse(cx - 46, cy - 25, 4, 8, Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Right headphone ear cup
      ctx.fillStyle = "#1b192b";
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx + 46, cy - 25, 9, 14, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right inner glow plate (pulsing)
      ctx.fillStyle = `${vibeColor}${isSpeaking ? 'cc' : '88'}`;
      ctx.beginPath();
      ctx.ellipse(cx + 46, cy - 25, 4, 8, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Cute tiny glowing cyber-neko cat ears attached to the headphones
      const earHue = vibeColor;
      ctx.fillStyle = "#1b192b";
      ctx.strokeStyle = earHue;
      ctx.lineWidth = 2;

      // Left ear
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 58);
      ctx.lineTo(cx - 50, cy - 78);
      ctx.lineTo(cx - 25, cy - 64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Left ear inner neon triangle
      ctx.fillStyle = `${vibeColor}aa`;
      ctx.beginPath();
      ctx.moveTo(cx - 33, cy - 60);
      ctx.lineTo(cx - 43, cy - 73);
      ctx.lineTo(cx - 27, cy - 64);
      ctx.closePath();
      ctx.fill();

      // Right ear
      ctx.fillStyle = "#1b192b";
      ctx.beginPath();
      ctx.moveTo(cx + 35, cy - 58);
      ctx.lineTo(cx + 50, cy - 78);
      ctx.lineTo(cx + 25, cy - 64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right ear inner neon triangle
      ctx.fillStyle = `${vibeColor}aa`;
      ctx.beginPath();
      ctx.moveTo(cx + 33, cy - 60);
      ctx.lineTo(cx + 43, cy - 73);
      ctx.lineTo(cx + 27, cy - 64);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, isThinking, outputAnalyser, inputAnalyser, vibeColor, vibeName]);

  return (
    <div className="relative flex items-center justify-center w-full h-full max-w-[380px] max-h-[380px] aspect-square mx-auto">
      {/* Absolute high-tech border aura around the companion */}
      <div
        className="absolute inset-0 rounded-full blur-[40px] opacity-20 pointer-events-none transition-all duration-700 animate-pulse"
        style={{ backgroundColor: vibeColor }}
      />
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full h-full z-10 select-none pointer-events-none"
        id="mahi-avatar-canvas"
      />
    </div>
  );
}
