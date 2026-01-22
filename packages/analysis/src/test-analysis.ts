/**
 * Test script for the Analysis Engine
 * Run with: npx tsx packages/analysis/src/test-analysis.ts <url>
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { analyzeApp } from "./browser-agent";
import { generateScript } from "./script-generator";
import * as fs from "fs";

async function main() {
  const url = process.argv[2] || "https://example.com";

  console.log("=".repeat(60));
  console.log("AppDemo.ai Analysis Engine Test");
  console.log("=".repeat(60));
  console.log(`\nTarget URL: ${url}\n`);

  try {
    // Step 1: Analyze the app
    console.log("Step 1: Analyzing application...\n");
    const analysis = await analyzeApp(url, {
      maxDepth: 2,
      maxPagesPerDomain: 5,
      headless: true,
      screenshotDir: "./tmp/test-screenshots",
    });

    console.log("\n--- Analysis Results ---");
    console.log(`Routes discovered: ${analysis.routes.length}`);
    console.log(`Features found: ${analysis.features.length}`);
    console.log(`User flows: ${analysis.flows.length}`);
    console.log(`Screenshots taken: ${analysis.screenshots.length}`);
    console.log(`Duration: ${analysis.metadata.duration}ms`);

    if (analysis.features.length > 0) {
      console.log("\nTop Features:");
      analysis.features.slice(0, 5).forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (importance: ${f.importance})`);
      });
    }

    // Save analysis to file
    const outputDir = "./tmp/test-output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, "analysis.json"),
      JSON.stringify(analysis, null, 2)
    );
    console.log(`\nAnalysis saved to ${outputDir}/analysis.json`);

    // Step 2: Generate script
    console.log("\n" + "=".repeat(60));
    console.log("Step 2: Generating demo script...\n");

    const script = await generateScript(analysis, {
      targetAudience: "Product managers and startup founders",
      tone: "professional",
      maxDuration: 90,
    });

    console.log("--- Script Results ---");
    console.log(`Title: ${script.title}`);
    console.log(`Total duration: ${script.totalDuration}s`);
    console.log(`Sections: ${script.sections.length}`);

    if (script.sections.length > 0) {
      console.log("\nScript Sections:");
      script.sections.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.duration}s)`);
        console.log(`     Actions: ${s.actions.length}`);
        console.log(`     Narration: "${s.narration.slice(0, 60)}..."`);
      });
    }

    // Save script to file
    fs.writeFileSync(
      path.join(outputDir, "script.json"),
      JSON.stringify(script, null, 2)
    );
    console.log(`\nScript saved to ${outputDir}/script.json`);

    console.log("\n" + "=".repeat(60));
    console.log("Analysis complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\nError during analysis:", error);
    process.exit(1);
  }
}

main();
