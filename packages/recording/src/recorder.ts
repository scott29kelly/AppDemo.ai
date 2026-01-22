import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import type {
  RecordingOptions,
  TimingMetadata,
  SectionTiming,
  ScriptAction,
  DemoScript,
} from "@appdemo/types";
import { OVERLAY_SCRIPT, getOverlayMethod } from "./overlay-system";

// ============================================
// Recording Configuration
// ============================================

interface RecorderConfig {
  headless: boolean;
  timeout: number;
}

const DEFAULT_CONFIG: RecorderConfig = {
  headless: false, // Show browser during recording for debugging
  timeout: 60000,
};

// ============================================
// Demo Recorder Class
// ============================================

export class DemoRecorder {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: RecorderConfig;

  constructor(config: Partial<RecorderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async record(options: RecordingOptions): Promise<{
    timingMetadata: TimingMetadata;
    videoPath: string;
  }> {
    const { script, outputDir, resolution } = options;

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`[Recorder] Starting recording`);
    console.log(`[Recorder] Resolution: ${resolution.width}x${resolution.height}`);
    console.log(`[Recorder] Output dir: ${outputDir}`);
    console.log(`[Recorder] Sections: ${script.sections.length}`);

    try {
      // Launch browser with video recording
      this.browser = await chromium.launch({
        headless: this.config.headless,
      });

      this.context = await this.browser.newContext({
        viewport: resolution,
        recordVideo: {
          dir: outputDir,
          size: resolution,
        },
      });

      this.page = await this.context.newPage();

      // Get the starting URL from the first navigate action
      const startUrl = this.findStartUrl(script);
      if (startUrl) {
        await this.page.goto(startUrl, {
          waitUntil: "networkidle",
          timeout: this.config.timeout,
        });
      }

      // Inject and initialize overlay system after initial navigation
      await this.injectOverlay();

      // Execute the script and record timing
      const timingMetadata = await this.executeScript(script);

      // Cleanup overlay (ignore errors if page already closed)
      try {
        if (!this.page!.isClosed()) {
          await this.page!.evaluate(() => {
            (window as any).overlay?.destroy();
          });
        }
      } catch {
        // Page may have closed, ignore
      }

      // Get video path before closing context
      const videoPath = await this.page!.video()?.path();

      // Close context to finalize video
      await this.context!.close();
      await this.browser!.close();

      this.browser = null;
      this.context = null;
      this.page = null;

      // Rename the video file to a consistent name
      const finalVideoPath = path.join(outputDir, "raw-recording.webm");
      if (videoPath && fs.existsSync(videoPath)) {
        fs.renameSync(videoPath, finalVideoPath);
      }

      console.log(`[Recorder] Recording complete: ${finalVideoPath}`);
      console.log(`[Recorder] Total duration: ${timingMetadata.totalDuration}ms`);

      return {
        timingMetadata,
        videoPath: finalVideoPath,
      };
    } catch (error) {
      // Cleanup on error
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
      throw error;
    }
  }

  private findStartUrl(script: DemoScript): string | null {
    for (const section of script.sections) {
      for (const action of section.actions) {
        if (action.type === "navigate" && action.value) {
          return action.value;
        }
      }
    }
    return null;
  }

  private async injectOverlay(): Promise<void> {
    if (!this.page) return;

    // Inject the overlay script and initialize
    await this.page.evaluate((script) => {
      // Execute the IIFE script
      eval(script);
      // Initialize the overlay instance
      (window as any).overlay = new (window as any).DemoOverlay();
    }, OVERLAY_SCRIPT);

    console.log(`[Recorder] Overlay injected`);
  }

  private async executeScript(script: DemoScript): Promise<TimingMetadata> {
    const sections: SectionTiming[] = [];
    let currentTime = 0;

    for (const section of script.sections) {
      console.log(`[Recorder] Recording section: ${section.name}`);

      const sectionStart = currentTime;
      let lastActionEnd = sectionStart;

      for (const action of section.actions) {
        // Calculate wait time until this action
        const waitTime = action.timing - (lastActionEnd - sectionStart);
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }

        // Execute overlay effect (if applicable)
        if (action.highlightStyle !== "none" && action.selector) {
          await this.executeOverlay(action);
        }

        // Execute the action
        await this.executeAction(action);

        // Update timing
        const actionDuration = action.highlightDuration || 1000;
        lastActionEnd = sectionStart + action.timing + actionDuration;
        currentTime = Math.max(currentTime, lastActionEnd);
      }

      // Ensure minimum section duration based on script
      const minSectionEnd = sectionStart + section.duration * 1000;
      if (currentTime < minSectionEnd) {
        await this.sleep(minSectionEnd - currentTime);
        currentTime = minSectionEnd;
      }

      sections.push({
        id: section.id,
        startTime: sectionStart,
        endTime: currentTime,
        narration: section.narration,
      });

      console.log(`[Recorder] Section complete: ${section.name} (${currentTime - sectionStart}ms)`);
    }

    return {
      sections,
      totalDuration: currentTime,
    };
  }

  private async executeOverlay(action: ScriptAction): Promise<void> {
    const method = getOverlayMethod(action.highlightStyle);
    if (!method || !action.selector) return;

    const duration = action.highlightDuration || 2000;
    const options: Record<string, unknown> = { duration };

    if (action.highlightLabel) {
      options.label = action.highlightLabel;
    }

    try {
      await this.page!.evaluate(
        ({ method, selector, options }) => {
          const overlay = (window as any).overlay;
          if (overlay && typeof overlay[method] === "function") {
            return overlay[method](selector, options);
          }
        },
        { method, selector: action.selector, options }
      );
    } catch (error) {
      console.warn(`[Recorder] Overlay error for ${action.selector}:`, error);
    }
  }

  private async executeAction(action: ScriptAction): Promise<void> {
    if (!this.page) return;

    try {
      switch (action.type) {
        case "click":
          if (action.selector) {
            // Wait for element to be visible
            await this.page.waitForSelector(action.selector, {
              state: "visible",
              timeout: 5000,
            }).catch(() => {});
            await this.page.click(action.selector).catch(() => {
              console.warn(`[Recorder] Click failed: ${action.selector}`);
            });
          }
          break;

        case "scroll":
          const scrollAmount = parseInt(action.value || "300", 10);
          await this.page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), scrollAmount);
          await this.sleep(500); // Allow smooth scroll to complete
          break;

        case "hover":
          if (action.selector) {
            await this.page.waitForSelector(action.selector, {
              state: "visible",
              timeout: 5000,
            }).catch(() => {});
            await this.page.hover(action.selector).catch(() => {
              console.warn(`[Recorder] Hover failed: ${action.selector}`);
            });
          }
          break;

        case "type":
          if (action.selector && action.value) {
            await this.page.waitForSelector(action.selector, {
              state: "visible",
              timeout: 5000,
            }).catch(() => {});
            await this.page.fill(action.selector, action.value).catch(() => {
              console.warn(`[Recorder] Type failed: ${action.selector}`);
            });
          }
          break;

        case "wait":
          const waitTime = parseInt(action.value || "1000", 10);
          await this.sleep(waitTime);
          break;

        case "navigate":
          if (action.value) {
            await this.page.goto(action.value, {
              waitUntil: "networkidle",
              timeout: this.config.timeout,
            });
            // Re-inject overlay after navigation (page context resets)
            await this.injectOverlay();
          }
          break;
      }
    } catch (error) {
      console.warn(`[Recorder] Action failed (${action.type}):`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }
}

// ============================================
// Main Export Function
// ============================================

/**
 * Records a demo video by executing the script actions
 * with Playwright and capturing the screen.
 */
export async function recordDemo(
  options: RecordingOptions
): Promise<{ timingMetadata: TimingMetadata; videoPath: string }> {
  const recorder = new DemoRecorder();
  return recorder.record(options);
}
