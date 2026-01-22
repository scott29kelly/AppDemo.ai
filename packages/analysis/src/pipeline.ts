#!/usr/bin/env node
/**
 * AppDemo.ai - Full Pipeline CLI
 *
 * Generates automated product demo videos from a URL.
 *
 * Usage:
 *   npx tsx packages/analysis/src/pipeline.ts <url> [options]
 *
 * Options:
 *   --output, -o     Output directory (default: ./output)
 *   --voice, -v      ElevenLabs voice ID (default: "21m00Tcm4TlvDq8ikWAM" - Rachel)
 *   --headless       Run browser in headless mode
 *   --skip-render    Skip rendering phase (just analyze and record)
 *   --help, -h       Show this help message
 *
 * Example:
 *   npx tsx packages/analysis/src/pipeline.ts https://example.com -o ./my-demo
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { analyzeApp } from "./browser-agent";
import { generateScript } from "./script-generator";
import { recordDemo } from "@appdemo/recording";
import { renderDemo } from "@appdemo/rendering";
import type { DemoScript, AppAnalysis, TimingMetadata } from "@appdemo/types";

// ============================================
// CLI Configuration
// ============================================

interface PipelineOptions {
  url: string;
  outputDir: string;
  voiceId: string;
  headless: boolean;
  skipRender: boolean;
  resolution: { width: number; height: number };
}

const DEFAULT_OPTIONS: Omit<PipelineOptions, "url"> = {
  outputDir: "./output",
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
  headless: false,
  skipRender: false,
  resolution: { width: 1920, height: 1080 },
};

// ============================================
// CLI Argument Parsing
// ============================================

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options: PipelineOptions = {
    ...DEFAULT_OPTIONS,
    url: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg?.startsWith("-")) {
      switch (arg) {
        case "--output":
        case "-o":
          options.outputDir = args[++i] || DEFAULT_OPTIONS.outputDir;
          break;
        case "--voice":
        case "-v":
          options.voiceId = args[++i] || DEFAULT_OPTIONS.voiceId;
          break;
        case "--headless":
          options.headless = true;
          break;
        case "--skip-render":
          options.skipRender = true;
          break;
        default:
          console.warn(`Unknown option: ${arg}`);
      }
    } else if (!options.url && arg) {
      options.url = arg;
    }
  }

  if (!options.url) {
    console.error("Error: URL is required");
    printHelp();
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(options.url);
  } catch {
    console.error(`Error: Invalid URL: ${options.url}`);
    process.exit(1);
  }

  return options;
}

function printHelp(): void {
  console.log(`
AppDemo.ai - Full Pipeline CLI

Generates automated product demo videos from a URL.

Usage:
  npx tsx packages/analysis/src/pipeline.ts <url> [options]

Options:
  --output, -o     Output directory (default: ./output)
  --voice, -v      ElevenLabs voice ID (default: "21m00Tcm4TlvDq8ikWAM" - Rachel)
  --headless       Run browser in headless mode
  --skip-render    Skip rendering phase (just analyze and record)
  --help, -h       Show this help message

Examples:
  npx tsx packages/analysis/src/pipeline.ts https://example.com
  npx tsx packages/analysis/src/pipeline.ts https://myapp.com -o ./my-demo --headless
  npx tsx packages/analysis/src/pipeline.ts https://myapp.com --skip-render

Environment Variables:
  ANTHROPIC_API_KEY    Required for script generation
  ELEVENLABS_API_KEY   Required for narration (unless --skip-render)
`);
}

// ============================================
// Pipeline Stages
// ============================================

async function runAnalysis(url: string, outputDir: string): Promise<AppAnalysis> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 1: Analyzing Application");
  console.log("=".repeat(60));

  const analysis = await analyzeApp(url, {
    maxDepth: 2,
    maxPagesPerDomain: 5,
    headless: true,
    screenshotDir: path.join(outputDir, "screenshots"),
  });

  console.log(`\n✓ Routes discovered: ${analysis.routes.length}`);
  console.log(`✓ Features found: ${analysis.features.length}`);
  console.log(`✓ User flows: ${analysis.flows.length}`);
  console.log(`✓ Duration: ${analysis.metadata.duration}ms`);

  // Save analysis
  fs.writeFileSync(
    path.join(outputDir, "analysis.json"),
    JSON.stringify(analysis, null, 2)
  );

  return analysis;
}

async function runScriptGeneration(
  analysis: AppAnalysis,
  url: string,
  outputDir: string
): Promise<DemoScript> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 1.5: Generating Demo Script");
  console.log("=".repeat(60));

  const script = await generateScript(analysis, {
    targetAudience: "Product managers and startup founders",
    tone: "professional",
    maxDuration: 90,
  });

  // Parse base URL for resolving relative URLs
  const baseUrl = new URL(url);

  // Normalize all navigate actions to use full URLs
  let hasValidNavigate = false;
  for (const section of script.sections) {
    for (const action of section.actions) {
      if (action.type === "navigate" && action.value) {
        // Convert relative URLs to absolute
        if (action.value.startsWith("/")) {
          action.value = `${baseUrl.origin}${action.value}`;
        } else if (!action.value.startsWith("http")) {
          action.value = new URL(action.value, url).href;
        }
        hasValidNavigate = true;
      }
    }
  }

  // If no navigate action, add one to the beginning
  if (!hasValidNavigate && script.sections.length > 0) {
    script.sections[0]!.actions.unshift({
      type: "navigate",
      value: url,
      timing: 0,
      highlightStyle: "none",
    });
  }

  console.log(`\n✓ Title: ${script.title}`);
  console.log(`✓ Sections: ${script.sections.length}`);
  console.log(`✓ Total duration: ${script.totalDuration}s`);

  // Save script
  fs.writeFileSync(
    path.join(outputDir, "script.json"),
    JSON.stringify(script, null, 2)
  );

  return script;
}

async function runRecording(
  script: DemoScript,
  outputDir: string,
  resolution: { width: number; height: number },
  headless: boolean
): Promise<{ timingMetadata: TimingMetadata; videoPath: string }> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 2: Recording Demo");
  console.log("=".repeat(60));

  const recordingDir = path.join(outputDir, "recording");

  const result = await recordDemo({
    script,
    outputDir: recordingDir,
    resolution,
  });

  console.log(`\n✓ Recording complete: ${result.videoPath}`);
  console.log(`✓ Total duration: ${result.timingMetadata.totalDuration}ms`);
  console.log(`✓ Sections recorded: ${result.timingMetadata.sections.length}`);

  // Save timing metadata
  fs.writeFileSync(
    path.join(outputDir, "timing.json"),
    JSON.stringify(result.timingMetadata, null, 2)
  );

  return result;
}

async function runRendering(
  rawVideoPath: string,
  timingMetadata: TimingMetadata,
  script: DemoScript,
  voiceId: string,
  outputDir: string
): Promise<{ videoPath: string; subtitlesPath: string }> {
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 3: Rendering Final Video");
  console.log("=".repeat(60));

  const result = await renderDemo({
    rawVideoPath,
    timingMetadata,
    script,
    branding: {
      primaryColor: "#4F46E5",
    },
    voice: {
      voiceId,
    },
    outputDir,
  });

  console.log(`\n✓ Final video: ${result.videoPath}`);
  console.log(`✓ Subtitles: ${result.subtitlesPath}`);

  return result;
}

// ============================================
// Main Pipeline
// ============================================

async function main(): Promise<void> {
  const options = parseArgs();

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    AppDemo.ai Pipeline                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nTarget URL: ${options.url}`);
  console.log(`Output: ${path.resolve(options.outputDir)}`);
  console.log(`Voice ID: ${options.voiceId}`);
  console.log(`Headless: ${options.headless}`);
  console.log(`Skip Render: ${options.skipRender}`);

  // Validate API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("\nError: ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  if (!options.skipRender && !process.env.ELEVENLABS_API_KEY) {
    console.error("\nError: ELEVENLABS_API_KEY is not set (required for rendering)");
    console.log("Use --skip-render to skip the rendering phase");
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const startTime = Date.now();

  try {
    // Phase 1: Analyze
    const analysis = await runAnalysis(options.url, outputDir);

    // Phase 1.5: Generate Script
    const script = await runScriptGeneration(analysis, options.url, outputDir);

    // Phase 2: Record
    const recording = await runRecording(
      script,
      outputDir,
      options.resolution,
      options.headless
    );

    // Phase 3: Render (optional)
    if (!options.skipRender) {
      const renderResult = await runRendering(
        recording.videoPath,
        recording.timingMetadata,
        script,
        options.voiceId,
        outputDir
      );

      console.log("\n" + "=".repeat(60));
      console.log("PIPELINE COMPLETE!");
      console.log("=".repeat(60));
      console.log(`\nOutput files:`);
      console.log(`  - Analysis: ${path.join(outputDir, "analysis.json")}`);
      console.log(`  - Script: ${path.join(outputDir, "script.json")}`);
      console.log(`  - Timing: ${path.join(outputDir, "timing.json")}`);
      console.log(`  - Raw Video: ${recording.videoPath}`);
      console.log(`  - Final Video: ${renderResult.videoPath}`);
      console.log(`  - Subtitles: ${renderResult.subtitlesPath}`);
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("PIPELINE COMPLETE (Rendering Skipped)");
      console.log("=".repeat(60));
      console.log(`\nOutput files:`);
      console.log(`  - Analysis: ${path.join(outputDir, "analysis.json")}`);
      console.log(`  - Script: ${path.join(outputDir, "script.json")}`);
      console.log(`  - Timing: ${path.join(outputDir, "timing.json")}`);
      console.log(`  - Raw Video: ${recording.videoPath}`);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\nTotal time: ${duration.toFixed(1)}s`);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("PIPELINE FAILED");
    console.error("=".repeat(60));
    console.error("\nError:", error);
    process.exit(1);
  }
}

main();
