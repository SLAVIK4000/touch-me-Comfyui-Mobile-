@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 0px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 0px);
  --radius-xl: calc(var(--radius) + 1px);
}

/* ============================================================
   Touch me — dark terminal / neon violet-blue design system
   Sharp corners, thin 1px borders, glass panels, soft glows
   ============================================================ */

:root {
  --radius: 2px;

  --background: oklch(0.13 0.02 285);
  --foreground: oklch(0.93 0.01 260);

  --card: oklch(0.17 0.03 285);
  --card-foreground: oklch(0.93 0.01 260);
  --popover: oklch(0.16 0.03 285);
  --popover-foreground: oklch(0.93 0.01 260);

  --primary: oklch(0.62 0.19 292);
  --primary-foreground: oklch(0.98 0.005 280);
  --secondary: oklch(0.22 0.04 285);
  --secondary-foreground: oklch(0.88 0.02 270);

  --muted: oklch(0.21 0.03 285);
  --muted-foreground: oklch(0.6 0.02 275);
  --accent: oklch(0.62 0.19 292);
  --accent-foreground: oklch(0.98 0.005 280);

  --destructive: oklch(0.65 0.22 25);

  --border: oklch(0.35 0.06 285 / 0.55);
  --input: oklch(0.35 0.06 285 / 0.55);
  --ring: oklch(0.62 0.19 292);

  --chart-1: oklch(0.62 0.19 292);
  --chart-2: oklch(0.7 0.15 255);
  --chart-3: oklch(0.5 0.12 285);
  --chart-4: oklch(0.75 0.18 300);
  --chart-5: oklch(0.55 0.16 260);

  --sidebar: oklch(0.16 0.03 285);
  --sidebar-foreground: oklch(0.93 0.01 260);
  --sidebar-primary: oklch(0.62 0.19 292);
  --sidebar-primary-foreground: oklch(0.98 0.005 280);
  --sidebar-accent: oklch(0.22 0.04 285);
  --sidebar-accent-foreground: oklch(0.88 0.02 270);
  --sidebar-border: oklch(0.35 0.06 285 / 0.55);
  --sidebar-ring: oklch(0.62 0.19 292);

  /* custom palette */
  --tm-bg: #07070d;
  --tm-panel: rgba(13, 13, 24, 0.55);
  --tm-panel-solid: #10101e;
  --tm-glass-block: rgba(18, 18, 34, 0.38);
  --tm-border: rgba(148, 130, 255, 0.2);
  --tm-border-soft: rgba(148, 130, 255, 0.11);
  --tm-text: #ececf6;
  --tm-text-dim: #9a99b8;
  --tm-violet: #a78bfa;
  --tm-violet-strong: #8b5cf6;
  --tm-blue: #60a5fa;
  --tm-blue-strong: #3b82f6;
  --tm-glow: 0 0 22px rgba(139, 92, 246, 0.35);
  --tm-glow-strong: 0 0 34px rgba(139, 92, 246, 0.5);
  /* высота нижней ленты управления: якорь для панели настроек */
  --tm-bb-h: 116px;
}

.dark {
  --background: oklch(0.13 0.02 285);
  --foreground: oklch(0.93 0.01 260);
  --card: oklch(0.17 0.03 285);
  --card-foreground: oklch(0.93 0.01 260);
  --popover: oklch(0.16 0.03 285);
  --popover-foreground: oklch(0.93 0.01 260);
  --primary: oklch(0.62 0.19 292);
  --primary-foreground: oklch(0.98 0.005 280);
  --secondary: oklch(0.22 0.04 285);
  --secondary-foreground: oklch(0.88 0.02 270);
  --muted: oklch(0.21 0.03 285);
  --muted-foreground: oklch(0.6 0.02 275);
  --accent: oklch(0.62 0.19 292);
  --accent-foreground: oklch(0.98 0.005 280);
  --destructive: oklch(0.65 0.22 25);
  --border: oklch(0.35 0.06 285 / 0.55);
  --input: oklch(0.35 0.06 285 / 0.55);
  --ring: oklch(0.62 0.19 292);
}

html,
body {
  height: 100%;
  background: var(--tm-bg);
  color: var(--tm-text);
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  margin: 0;
}

/* app lock-down: no accidental text/page selection while gesturing */
.tm-noselect {
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
}

.tm-allow-select {
  -webkit-user-select: text;
  user-select: text;
}

/* ---------- utility pieces ---------- */

/*
 * Glass UI: единый матовый «стакан» для всех панелей приложения.
 * Полупрозрачный градиент + сильный блюр фона + насыщенность цвета,
 * внутренняя подсветка кромок и тонкое внешнее свечение —
 * панели выглядят цельным стеклом, а не плоскими прямоугольниками.
 */
.tm-panel {
  background:
    linear-gradient(
      165deg,
      rgba(30, 30, 56, 0.42) 0%,
      rgba(14, 14, 28, 0.58) 46%,
      rgba(10, 10, 22, 0.66) 100%
    );
  backdrop-filter: blur(26px) saturate(1.55);
  -webkit-backdrop-filter: blur(26px) saturate(1.55);
  border: 1px solid rgba(148, 130, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 24px rgba(139, 92, 246, 0.05),
    0 0 0 1px rgba(0, 0, 0, 0.32),
    0 16px 44px rgba(0, 0, 0, 0.5),
    0 0 26px rgba(139, 92, 246, 0.14);
}

/* светящаяся кромка сверху «стакана» */
.tm-panel::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(167, 139, 250, 0.55),
    rgba(96, 165, 250, 0.4),
    transparent
  );
  pointer-events: none;
}

/* вложенный блок внутри стеклянной панели */
.tm-glass-block {
  background: var(--tm-glass-block);
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  border: 1px solid rgba(148, 130, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.tm-mono {
  font-family: var(--font-geist-mono), monospace;
}

.tm-label {
  font-family: var(--font-geist-mono), monospace;
  font-size: 9.5px;
  line-height: 1.2;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--tm-text-dim);
}

.tm-glow {
  box-shadow: var(--tm-glow);
}

.tm-glow-text {
  text-shadow: 0 0 14px rgba(167, 139, 250, 0.65);
}

.tm-vscroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.35) transparent;
  -webkit-overflow-scrolling: touch;
}

.tm-vscroll::-webkit-scrollbar {
  width: 3px;
}

.tm-vscroll::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.4);
}

.tm-hscroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.tm-hscroll::-webkit-scrollbar {
  display: none;
}

/* scanline texture overlay for panels (subtle) */
.tm-scanlines::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.015) 0px,
    rgba(255, 255, 255, 0.015) 1px,
    transparent 1px,
    transparent 4px
  );
  mix-blend-mode: overlay;
}

/* ---------- animations ---------- */

@keyframes tm-slide-up {
  from {
    transform: translateY(28px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes tm-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes tm-pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.45);
  }
  50% {
    box-shadow: 0 0 26px rgba(139, 92, 246, 0.8);
  }
}

@keyframes tm-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes tm-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.anim-slide-up {
  animation: tm-slide-up 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.anim-fade-in {
  animation: tm-fade-in 0.18s ease-out both;
}

.anim-pulse-glow {
  animation: tm-pulse-glow 1.8s ease-in-out infinite;
}

.anim-blink {
  animation: tm-blink 1.1s steps(2) infinite;
}

.tm-progress-shimmer {
  background: linear-gradient(
    90deg,
    rgba(167, 139, 250, 0.25) 25%,
    rgba(167, 139, 250, 0.95) 50%,
    rgba(167, 139, 250, 0.25) 75%
  );
  background-size: 200% 100%;
  animation: tm-shimmer 1.4s linear infinite;
}

/* thin divider with violet tint */
.tm-hr {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(148, 130, 255, 0.28),
    transparent
  );
}

/* glass v2 */
