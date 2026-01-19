# AppDemo.ai — Technical Implementation Guide

**Companion document to the Product Specification**

---

## Table of Contents

1. [Analysis Engine Code](#analysis-engine-code)
2. [Recording Engine Code](#recording-engine-code)
3. [Render Engine Code](#render-engine-code)
4. [Database Schema](#database-schema)
5. [TypeScript Types](#typescript-types)
6. [API Reference](#api-reference)
7. [Monorepo Structure](#monorepo-structure)

---

## Analysis Engine Code

### Browser Agent (using Stagehand)

\`\`\`typescript
// packages/analysis/browser-agent.ts

import { Stagehand } from "@browserbase/stagehand";
import { z } from "zod";

interface AppAnalysis {
  routes: Route[];
  features: Feature[];
  flows: UserFlow[];
  screenshots: Screenshot[];
}

interface Route {
  path: string;
  title: string;
  description: string;
  interactiveElements: Element[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  importance: number; // 1-10
  selectors: string[];
  screenshots: string[];
}

interface UserFlow {
  id: string;
  name: string;
  steps: FlowStep[];
  estimatedDuration: number;
}

export async function analyzeApp(url: string): Promise<AppAnalysis> {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: true,
  });
  
  await stagehand.init();
  const page = stagehand.page;
  
  // Navigate to starting URL
  await page.goto(url);
  
  // Use AI to identify key features
  const features = await stagehand.extract(
    "Identify all the main features and interactive elements on this page. " +
    "For each feature, provide: name, description, importance (1-10), and CSS selector.",
    z.array(z.object({
      name: z.string(),
      description: z.string(),
      importance: z.number(),
      selector: z.string(),
    }))
  );
  
  // Explore the app
  const routes: Route[] = [];
  const visited = new Set<string>();
  
  async function exploreRoute(currentUrl: string, depth = 0) {
    if (visited.has(currentUrl) || depth > 3) return;
    visited.add(currentUrl);
    
    const pageInfo = await stagehand.extract(
      "Describe this page: title, purpose, key elements",
      z.object({
        title: z.string(),
        description: z.string(),
        elements: z.array(z.object({
          type: z.string(),
          purpose: z.string(),
          selector: z.string(),
        }))
      })
    );
    
    routes.push({
      path: new URL(currentUrl).pathname,
      title: pageInfo.title,
      description: pageInfo.description,
      interactiveElements: pageInfo.elements,
    });
    
    // Find and explore navigation links
    const links = await page.$$eval('a[href]', (anchors) =>
      anchors
        .map(a => a.href)
        .filter(href => href.startsWith(window.location.origin))
        .slice(0, 5)
    );
    
    for (const link of links) {
      await page.goto(link);
      await exploreRoute(link, depth + 1);
    }
  }
  
  await exploreRoute(url);
  await stagehand.close();
  
  return {
    routes,
    features,
    flows: generateFlows(routes, features),
    screenshots: [],
  };
}

function generateFlows(routes: Route[], features: Feature[]): UserFlow[] {
  // AI would generate logical user flows from routes and features
  return [];
}
\`\`\`

### Script Generator

\`\`\`typescript
// packages/analysis/script-generator.ts

import Anthropic from "@anthropic-ai/sdk";

export interface DemoScript {
  title: string;
  targetAudience: string;
  totalDuration: number;
  sections: ScriptSection[];
  versions: {
    teaser: string[];
    standard: string[];
    full: string[];
  };
}

export interface ScriptSection {
  id: string;
  name: string;
  narration: string;
  duration: number;
  actions: ScriptAction[];
}

export interface ScriptAction {
  type: "click" | "scroll" | "hover" | "type" | "wait" | "navigate";
  selector?: string;
  value?: string;
  timing: number;
  highlightStyle: "arrow" | "spotlight" | "box" | "zoom" | "none";
  highlightDuration?: number;
  highlightLabel?: string;
}

export async function generateScript(
  analysis: AppAnalysis,
  options: {
    targetAudience?: string;
    focusAreas?: string[];
    tone?: "professional" | "casual" | "technical";
    maxDuration?: number;
  }
): Promise<DemoScript> {
  const anthropic = new Anthropic();
  
  const prompt = \`You are an expert product demo scriptwriter. 
Based on the following app analysis, create a compelling demo script.

APP ANALYSIS:
\${JSON.stringify(analysis, null, 2)}

TARGET AUDIENCE: \${options.targetAudience || "General SaaS users"}
TONE: \${options.tone || "professional"}
MAX DURATION: \${options.maxDuration || 300} seconds

Create a demo script that:
1. Starts with a hook (problem/solution statement)
2. Showcases the most impressive features first
3. Includes specific click/scroll actions with CSS selectors
4. Has natural transitions between sections
5. Ends with a clear call-to-action

For each action, specify:
- The exact CSS selector to interact with
- The type of highlight overlay (arrow, spotlight, box, zoom)
- Timing in milliseconds from section start

Return valid JSON matching this TypeScript interface:
interface DemoScript {
  title: string;
  targetAudience: string;
  totalDuration: number;
  sections: {
    id: string;
    name: string;
    narration: string;
    duration: number;
    actions: {
      type: "click" | "scroll" | "hover" | "type" | "wait" | "navigate";
      selector?: string;
      value?: string;
      timing: number;
      highlightStyle: "arrow" | "spotlight" | "box" | "zoom" | "none";
      highlightDuration?: number;
    }[];
  }[];
  versions: {
    teaser: string[];
    standard: string[];
    full: string[];
  };
}\`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text) as DemoScript;
}
\`\`\`

---

## Recording Engine Code

### Overlay System (Injected into Browser)

\`\`\`typescript
// packages/recording/overlay-system.ts

/**
 * This script is injected into the browser during recording.
 * It renders arrows, spotlights, and highlight boxes on a Canvas overlay.
 */

class DemoOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrame: number | null = null;
  
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "appdemo-overlay";
    this.canvas.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
    \`;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext("2d")!;
    
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }
  
  async drawArrow(
    selector: string,
    options: { color?: string; duration?: number; pulse?: boolean } = {}
  ): Promise<void> {
    const { color = "#FF4444", duration = 2000, pulse = true } = options;
    
    const element = document.querySelector(selector);
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top - 20;
    const startX = targetX - 80;
    const startY = targetY - 60;
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const scale = pulse ? 1 + Math.sin(elapsed / 200) * 0.1 : 1;
        
        this.ctx.save();
        this.ctx.translate(startX, startY);
        this.ctx.scale(scale, scale);
        
        // Arrow body
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(60, 40);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        
        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(60, 40);
        this.ctx.lineTo(45, 35);
        this.ctx.lineTo(50, 50);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        this.ctx.restore();
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
  
  async spotlight(
    selector: string,
    options: { duration?: number; dimOpacity?: number; padding?: number } = {}
  ): Promise<void> {
    const { duration = 2000, dimOpacity = 0.6, padding = 10 } = options;
    
    const element = document.querySelector(selector);
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const opacity = dimOpacity * Math.min(progress * 2, 1);
        
        // Draw semi-transparent overlay
        this.ctx.fillStyle = \`rgba(0, 0, 0, \${opacity})\`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Cut out the spotlight area
        this.ctx.globalCompositeOperation = "destination-out";
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(
          rect.left - padding,
          rect.top - padding,
          rect.width + padding * 2,
          rect.height + padding * 2
        );
        this.ctx.globalCompositeOperation = "source-over";
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
  
  async highlightBox(
    selector: string,
    options: { color?: string; duration?: number; label?: string } = {}
  ): Promise<void> {
    const { color = "#00FF88", duration = 2000, label } = options;
    
    const element = document.querySelector(selector);
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const padding = 5;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
          rect.left - padding,
          rect.top - padding,
          rect.width + padding * 2,
          rect.height + padding * 2
        );
        
        if (label && progress > 0.3) {
          this.ctx.font = "bold 14px Arial";
          this.ctx.fillStyle = color;
          this.ctx.fillText(label, rect.left - padding, rect.top - padding - 8);
        }
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
  
  clear(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  destroy(): void {
    this.clear();
    this.canvas.remove();
  }
}

// Expose globally for injection
(window as any).DemoOverlay = DemoOverlay;
\`\`\`

### Recording Orchestrator

\`\`\`typescript
// packages/recording/recorder.ts

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

interface RecordingOptions {
  script: DemoScript;
  outputDir: string;
  resolution: { width: number; height: number };
}

export async function recordDemo(options: RecordingOptions) {
  const { script, outputDir, resolution } = options;
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  const browser = await chromium.launch({ headless: false });
  
  const context = await browser.newContext({
    viewport: resolution,
    recordVideo: {
      dir: outputDir,
      size: resolution,
    },
  });
  
  const page = await context.newPage();
  
  // Inject overlay system
  await page.addScriptTag({
    path: path.join(__dirname, "overlay-system.js"),
  });
  
  await page.evaluate(() => {
    (window as any).overlay = new (window as any).DemoOverlay();
  });
  
  // Execute each section
  const timingMetadata: any = { sections: [], totalDuration: 0 };
  let currentTime = 0;
  
  for (const section of script.sections) {
    const sectionStart = currentTime;
    
    for (const action of section.actions) {
      await sleep(action.timing - (currentTime - sectionStart));
      
      // Execute overlay
      if (action.highlightStyle !== "none" && action.selector) {
        await executeOverlay(page, action);
      }
      
      // Execute action
      await executeAction(page, action);
      
      currentTime = sectionStart + action.timing + (action.highlightDuration || 0);
    }
    
    timingMetadata.sections.push({
      id: section.id,
      startTime: sectionStart,
      endTime: currentTime,
      narration: section.narration,
    });
  }
  
  timingMetadata.totalDuration = currentTime;
  
  await page.evaluate(() => (window as any).overlay.destroy());
  await context.close();
  await browser.close();
  
  return { timingMetadata };
}

async function executeOverlay(page: any, action: ScriptAction): Promise<void> {
  const { highlightStyle, selector, highlightDuration = 2000 } = action;
  
  switch (highlightStyle) {
    case "arrow":
      await page.evaluate(
        ([sel, dur]) => (window as any).overlay.drawArrow(sel, { duration: dur }),
        [selector, highlightDuration]
      );
      break;
    case "spotlight":
      await page.evaluate(
        ([sel, dur]) => (window as any).overlay.spotlight(sel, { duration: dur }),
        [selector, highlightDuration]
      );
      break;
    case "box":
      await page.evaluate(
        ([sel, dur]) => (window as any).overlay.highlightBox(sel, { duration: dur }),
        [selector, highlightDuration]
      );
      break;
  }
}

async function executeAction(page: any, action: ScriptAction): Promise<void> {
  switch (action.type) {
    case "click":
      if (action.selector) await page.click(action.selector);
      break;
    case "scroll":
      await page.evaluate((y) => window.scrollBy(0, y), action.value || 300);
      break;
    case "hover":
      if (action.selector) await page.hover(action.selector);
      break;
    case "type":
      if (action.selector && action.value) {
        await page.fill(action.selector, action.value);
      }
      break;
    case "wait":
      await sleep(parseInt(action.value || "1000"));
      break;
    case "navigate":
      if (action.value) await page.goto(action.value);
      break;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
\`\`\`

---

## Render Engine Code

### Video Compositor

\`\`\`typescript
// packages/rendering/compositor.ts

import ffmpeg from "fluent-ffmpeg";
import ElevenLabs from "elevenlabs-node";
import fs from "fs";
import path from "path";

interface RenderOptions {
  rawVideoPath: string;
  timingMetadata: TimingMetadata;
  script: DemoScript;
  branding: {
    logoPath?: string;
    primaryColor: string;
  };
  voice: {
    voiceId: string;
  };
  outputDir: string;
}

export async function renderDemo(options: RenderOptions) {
  const { rawVideoPath, timingMetadata, script, voice, outputDir } = options;
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  // 1. Generate narration audio
  const audioSegments = await generateNarration(script, voice, outputDir);
  
  // 2. Combine audio with timing
  const combinedAudioPath = await combineAudio(audioSegments, timingMetadata, outputDir);
  
  // 3. Composite final video
  const finalVideoPath = await compositeVideo({
    rawVideoPath,
    audioPath: combinedAudioPath,
    outputPath: path.join(outputDir, "final.mp4"),
  });
  
  // 4. Generate subtitles
  const subtitlesPath = generateSubtitles(script, timingMetadata, outputDir);
  
  return {
    videoPath: finalVideoPath,
    subtitlesPath,
  };
}

async function generateNarration(
  script: DemoScript,
  voice: { voiceId: string },
  outputDir: string
) {
  const elevenLabs = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY!,
  });
  
  const segments = [];
  
  for (const section of script.sections) {
    const audioPath = path.join(outputDir, \`narration-\${section.id}.mp3\`);
    
    const audioBuffer = await elevenLabs.textToSpeech({
      voiceId: voice.voiceId,
      text: section.narration,
      modelId: "eleven_multilingual_v2",
    });
    
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    
    segments.push({
      sectionId: section.id,
      audioPath,
    });
  }
  
  return segments;
}

async function combineAudio(
  segments: any[],
  timing: TimingMetadata,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, "combined-audio.mp3");
  
  // Use FFmpeg to position audio segments at correct timestamps
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    
    for (const segment of segments) {
      command = command.input(segment.audioPath);
    }
    
    const filters: string[] = [];
    const inputs: string[] = [];
    
    segments.forEach((segment, i) => {
      const sectionTiming = timing.sections.find((s) => s.id === segment.sectionId);
      if (!sectionTiming) return;
      
      const delayMs = sectionTiming.startTime;
      filters.push(\`[\${i}:a]adelay=\${delayMs}|\${delayMs}[a\${i}]\`);
      inputs.push(\`[a\${i}]\`);
    });
    
    filters.push(\`\${inputs.join("")}amix=inputs=\${inputs.length}:duration=longest[out]\`);
    
    command
      .complexFilter(filters)
      .outputOptions(["-map", "[out]"])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

async function compositeVideo(options: {
  rawVideoPath: string;
  audioPath: string;
  outputPath: string;
}): Promise<string> {
  const { rawVideoPath, audioPath, outputPath } = options;
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(rawVideoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

function generateSubtitles(
  script: DemoScript,
  timing: TimingMetadata,
  outputDir: string
): string {
  const outputPath = path.join(outputDir, "subtitles.srt");
  
  let srt = "";
  let index = 1;
  
  for (const section of timing.sections) {
    const scriptSection = script.sections.find((s) => s.id === section.id);
    if (!scriptSection) continue;
    
    const startTime = formatSrtTime(section.startTime);
    const endTime = formatSrtTime(section.endTime);
    
    srt += \`\${index}\n\`;
    srt += \`\${startTime} --> \${endTime}\n\`;
    srt += \`\${scriptSection.narration}\n\n\`;
    
    index++;
  }
  
  fs.writeFileSync(outputPath, srt);
  return outputPath;
}

function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return \`\${pad(hours)}:\${pad(minutes)}:\${pad(seconds)},\${pad(milliseconds, 3)}\`;
}

function pad(num: number, length: number = 2): string {
  return num.toString().padStart(length, "0");
}
\`\`\`

---

## Database Schema

\`\`\`sql
-- PostgreSQL Schema

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Input
  app_url TEXT NOT NULL,
  github_url TEXT,
  target_audience TEXT,
  
  -- Generated content (JSONB)
  analysis JSONB,
  script JSONB,
  timing_metadata JSONB,
  
  -- Output files (S3/R2 URLs)
  video_teaser_url TEXT,
  video_standard_url TEXT,
  video_full_url TEXT,
  subtitles_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_jobs_project_id ON jobs(project_id);
\`\`\`

---

## Monorepo Structure

\`\`\`
appdemo/
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── projects/
│   │   │   │   └── settings/
│   │   │   ├── api/
│   │   │   │   └── trpc/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── lib/
│   │
│   └── worker/                 # Background job processor
│       ├── jobs/
│       │   ├── analysis.ts
│       │   ├── recording.ts
│       │   └── rendering.ts
│       └── index.ts
│
├── packages/
│   ├── analysis/               # App analysis engine
│   │   ├── browser-agent.ts
│   │   ├── script-generator.ts
│   │   └── index.ts
│   │
│   ├── recording/              # Recording engine
│   │   ├── overlay-system.ts
│   │   ├── recorder.ts
│   │   └── index.ts
│   │
│   ├── rendering/              # Render engine
│   │   ├── compositor.ts
│   │   └── index.ts
│   │
│   ├── database/               # Prisma client
│   │   ├── schema.prisma
│   │   └── index.ts
│   │
│   └── types/                  # Shared types
│       └── index.ts
│
├── turbo.json
├── package.json
└── README.md
\`\`\`

---

## Environment Variables

\`\`\`bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=https://appdemo.ai

# Database (Supabase)
DATABASE_URL=postgresql://...

# Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Queue (Upstash Redis)
REDIS_URL=rediss://...

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=appdemo-videos

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
ELEVENLABS_API_KEY=xxx

# Browser Automation
BROWSERBASE_API_KEY=xxx

# Billing
STRIPE_SECRET_KEY=sk_live_xxx
\`\`\`

---

## Getting Started

\`\`\`bash
# Clone and install
git clone https://github.com/youruser/appdemo.git
cd appdemo
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your keys

# Set up database
pnpm db:push
pnpm db:seed

# Run development
pnpm dev          # Web app on :3000
pnpm worker:dev   # Job processor
\`\`\`

---

*This technical spec accompanies the main product specification document.*
