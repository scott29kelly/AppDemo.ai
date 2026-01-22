import { chromium, Browser, Page, BrowserContext } from "playwright";
import type {
  AppAnalysis,
  Route,
  Feature,
  UserFlow,
  Screenshot,
  InteractiveElement,
  FlowStep,
} from "@appdemo/types";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================
// Configuration
// ============================================

interface AnalysisConfig {
  maxDepth: number;
  maxPagesPerDomain: number;
  screenshotDir: string;
  timeout: number;
  headless: boolean;
  viewport: { width: number; height: number };
}

const DEFAULT_CONFIG: AnalysisConfig = {
  maxDepth: 3,
  maxPagesPerDomain: 10,
  screenshotDir: "./tmp/screenshots",
  timeout: 30000,
  headless: true,
  viewport: { width: 1920, height: 1080 },
};

// ============================================
// Browser Agent Class
// ============================================

export class BrowserAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: AnalysisConfig;
  private visitedUrls: Set<string> = new Set();
  private baseUrl: string = "";
  private screenshots: Screenshot[] = [];

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    this.page = await this.context.newPage();

    // Ensure screenshot directory exists
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async analyzeApp(url: string): Promise<AppAnalysis> {
    const startTime = Date.now();

    if (!this.page) {
      await this.init();
    }

    try {
      this.baseUrl = new URL(url).origin;
      this.visitedUrls.clear();
      this.screenshots = [];

      console.log(`[BrowserAgent] Starting analysis of ${url}`);

      // Navigate to starting URL
      await this.page!.goto(url, {
        waitUntil: "networkidle",
        timeout: this.config.timeout,
      });

      // Explore the application
      const routes = await this.exploreApp(url, 0);

      // Extract features from all discovered routes
      const features = await this.extractFeatures(routes);

      // Generate user flows based on routes and features
      const flows = this.generateUserFlows(routes, features);

      const duration = Date.now() - startTime;

      console.log(
        `[BrowserAgent] Analysis complete. Found ${routes.length} routes, ${features.length} features`
      );

      return {
        routes,
        features,
        flows,
        screenshots: this.screenshots,
        metadata: {
          analyzedAt: new Date(),
          duration,
          pagesVisited: this.visitedUrls.size,
        },
      };
    } finally {
      await this.close();
    }
  }

  private async exploreApp(url: string, depth: number): Promise<Route[]> {
    if (
      depth > this.config.maxDepth ||
      this.visitedUrls.size >= this.config.maxPagesPerDomain
    ) {
      return [];
    }

    const normalizedUrl = this.normalizeUrl(url);
    if (this.visitedUrls.has(normalizedUrl)) {
      return [];
    }

    this.visitedUrls.add(normalizedUrl);
    console.log(
      `[BrowserAgent] Exploring: ${normalizedUrl} (depth: ${depth})`
    );

    const routes: Route[] = [];

    try {
      // Navigate if not already on this page
      if (this.page!.url() !== url) {
        await this.page!.goto(url, {
          waitUntil: "networkidle",
          timeout: this.config.timeout,
        });
      }

      // Wait for page to stabilize
      await this.page!.waitForTimeout(1000);

      // Take screenshot
      const screenshot = await this.takeScreenshot(normalizedUrl);
      if (screenshot) {
        this.screenshots.push(screenshot);
      }

      // Extract page information
      const pageInfo = await this.extractPageInfo();
      const interactiveElements = await this.extractInteractiveElements();

      routes.push({
        path: new URL(normalizedUrl).pathname,
        title: pageInfo.title,
        description: pageInfo.description,
        interactiveElements,
      });

      // Find navigation links to explore
      const links = await this.findNavigationLinks();

      // Explore linked pages
      for (const link of links.slice(0, 5)) {
        const childRoutes = await this.exploreApp(link, depth + 1);
        routes.push(...childRoutes);
      }
    } catch (error) {
      console.error(`[BrowserAgent] Error exploring ${url}:`, error);
    }

    return routes;
  }

  private normalizeUrl(url: string): string {
    const parsed = new URL(url);
    // Remove trailing slash and hash
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
  }

  private async takeScreenshot(url: string): Promise<Screenshot | null> {
    try {
      const id = crypto.randomUUID();
      const filename = `${id}.png`;
      const filepath = path.join(this.config.screenshotDir, filename);

      await this.page!.screenshot({
        path: filepath,
        fullPage: false,
      });

      return {
        id,
        path: filepath,
        route: new URL(url).pathname,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[BrowserAgent] Screenshot error:`, error);
      return null;
    }
  }

  private async extractPageInfo(): Promise<{
    title: string;
    description: string;
  }> {
    return this.page!.evaluate(() => {
      const title =
        document.title ||
        document.querySelector("h1")?.textContent?.trim() ||
        "Untitled Page";

      const metaDesc = document.querySelector('meta[name="description"]');
      const description =
        metaDesc?.getAttribute("content") ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("p")?.textContent?.trim()?.slice(0, 200) ||
        "No description available";

      return { title, description };
    });
  }

  private async extractInteractiveElements(): Promise<InteractiveElement[]> {
    // Use page.evaluate with a string function to avoid transpiler issues
    const extractScript = `
      (() => {
        function getSelector(el) {
          if (el.id) return '#' + el.id;
          if (el.getAttribute('data-testid'))
            return '[data-testid="' + el.getAttribute('data-testid') + '"]';

          const classes = Array.from(el.classList)
            .filter(c => !c.includes(':') && c.length < 30)
            .slice(0, 2);
          if (classes.length > 0) {
            const selector = el.tagName.toLowerCase() + '.' + classes.join('.');
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          }

          const parent = el.parentElement;
          if (parent) {
            const sameTagSiblings = Array.from(parent.children).filter(
              child => child.tagName === el.tagName
            );
            if (sameTagSiblings.length === 1) {
              return el.tagName.toLowerCase();
            }
            const index = sameTagSiblings.indexOf(el) + 1;
            return el.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
          }

          return el.tagName.toLowerCase();
        }

        const results = [];

        // Buttons
        document.querySelectorAll('button, [role="button"]').forEach((el, i) => {
          const text = (el.textContent || '').trim() ||
            el.getAttribute('aria-label') ||
            'Button ' + (i + 1);
          if (text && text.length < 50) {
            results.push({
              type: 'button',
              purpose: text,
              selector: getSelector(el),
            });
          }
        });

        // Links (navigation)
        document.querySelectorAll('nav a, header a, [role="navigation"] a').forEach((el, i) => {
          const text = (el.textContent || '').trim() || 'Link ' + (i + 1);
          if (text && text.length < 50) {
            results.push({
              type: 'navigation',
              purpose: text,
              selector: getSelector(el),
            });
          }
        });

        // Input fields
        document.querySelectorAll('input, textarea, select').forEach((el, i) => {
          const input = el;
          const labelEl = document.querySelector('label[for="' + input.id + '"]');
          const label = input.placeholder ||
            input.getAttribute('aria-label') ||
            (labelEl ? labelEl.textContent.trim() : null) ||
            'Input ' + (i + 1);
          results.push({
            type: input.type || 'input',
            purpose: label,
            selector: getSelector(el),
          });
        });

        return results.slice(0, 20);
      })()
    `;

    try {
      const elements = await this.page!.evaluate(extractScript);
      return elements as InteractiveElement[];
    } catch (error) {
      console.error("[BrowserAgent] Error extracting elements:", error);
      return [];
    }
  }

  private async findNavigationLinks(): Promise<string[]> {
    const baseUrl = this.baseUrl;

    return this.page!.evaluate((base) => {
      const links: string[] = [];
      const seen = new Set<string>();

      document.querySelectorAll("a[href]").forEach((el) => {
        const href = el.getAttribute("href");
        if (!href) return;

        try {
          const url = new URL(href, window.location.origin);

          // Only include same-origin links
          if (url.origin !== base) return;

          // Skip anchors, javascript, and common non-page links
          if (
            url.pathname.includes("#") ||
            href.startsWith("javascript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            url.pathname.match(/\.(pdf|png|jpg|jpeg|gif|svg|css|js)$/i)
          ) {
            return;
          }

          const normalized = url.pathname;
          if (!seen.has(normalized)) {
            seen.add(normalized);
            links.push(url.href);
          }
        } catch {
          // Invalid URL, skip
        }
      });

      return links;
    }, baseUrl);
  }

  private async extractFeatures(routes: Route[]): Promise<Feature[]> {
    const features: Feature[] = [];
    const featureMap = new Map<string, Feature>();

    // Aggregate interactive elements across routes into features
    for (const route of routes) {
      for (const element of route.interactiveElements) {
        // Group by purpose (lowercase, trimmed)
        const key = element.purpose.toLowerCase().trim();

        if (!featureMap.has(key)) {
          featureMap.set(key, {
            id: crypto.randomUUID(),
            name: element.purpose,
            description: `${element.type}: ${element.purpose}`,
            importance: this.calculateImportance(element),
            selectors: [element.selector],
            screenshots: [],
          });
        } else {
          const feature = featureMap.get(key)!;
          if (!feature.selectors.includes(element.selector)) {
            feature.selectors.push(element.selector);
          }
        }
      }
    }

    // Convert to array and sort by importance
    features.push(...featureMap.values());
    features.sort((a, b) => b.importance - a.importance);

    // Keep top 15 features
    return features.slice(0, 15);
  }

  private calculateImportance(element: InteractiveElement): number {
    let score = 5; // Base score

    // Button actions are generally important
    if (element.type === "button") score += 2;

    // Navigation links are important
    if (element.type === "navigation") score += 1;

    // Common important keywords
    const importantKeywords = [
      "sign up",
      "signup",
      "get started",
      "create",
      "add",
      "new",
      "login",
      "register",
      "submit",
      "save",
      "search",
      "dashboard",
      "settings",
    ];

    const purpose = element.purpose.toLowerCase();
    for (const keyword of importantKeywords) {
      if (purpose.includes(keyword)) {
        score += 2;
        break;
      }
    }

    return Math.min(score, 10); // Cap at 10
  }

  private generateUserFlows(routes: Route[], features: Feature[]): UserFlow[] {
    const flows: UserFlow[] = [];

    // Generate a primary onboarding flow
    if (features.length > 0) {
      const onboardingSteps: FlowStep[] = [];
      let order = 1;

      // Look for sign up / get started features
      const signupFeature = features.find(
        (f) =>
          f.name.toLowerCase().includes("sign up") ||
          f.name.toLowerCase().includes("get started") ||
          f.name.toLowerCase().includes("register")
      );

      if (signupFeature) {
        onboardingSteps.push({
          order: order++,
          action: "click",
          selector: signupFeature.selectors[0],
          description: `Click "${signupFeature.name}" to begin registration`,
        });
      }

      // Add top features as demo steps
      const topFeatures = features.slice(0, 5);
      for (const feature of topFeatures) {
        if (feature !== signupFeature) {
          onboardingSteps.push({
            order: order++,
            action: feature.selectors[0]?.includes("input") ? "type" : "click",
            selector: feature.selectors[0],
            description: `Interact with "${feature.name}"`,
          });
        }
      }

      if (onboardingSteps.length > 0) {
        flows.push({
          id: crypto.randomUUID(),
          name: "Primary User Journey",
          steps: onboardingSteps,
          estimatedDuration: onboardingSteps.length * 5, // 5 seconds per step
        });
      }
    }

    // Generate navigation flow
    if (routes.length > 1) {
      const navSteps: FlowStep[] = routes.slice(0, 5).map((route, i) => ({
        order: i + 1,
        action: "navigate",
        selector: undefined,
        description: `Visit ${route.title} (${route.path})`,
      }));

      flows.push({
        id: crypto.randomUUID(),
        name: "App Navigation Overview",
        steps: navSteps,
        estimatedDuration: navSteps.length * 8, // 8 seconds per page
      });
    }

    return flows;
  }
}

// ============================================
// Main Export Function
// ============================================

/**
 * Analyzes a web application by crawling and exploring its features.
 * Uses Playwright for browser automation with AI-powered feature extraction.
 */
export async function analyzeApp(
  url: string,
  config?: Partial<AnalysisConfig>
): Promise<AppAnalysis> {
  const agent = new BrowserAgent(config);
  return agent.analyzeApp(url);
}
