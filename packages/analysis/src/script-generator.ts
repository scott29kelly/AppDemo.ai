import Anthropic from "@anthropic-ai/sdk";
import type {
  AppAnalysis,
  DemoScript,
  GenerateScriptOptions,
  ScriptSection,
  ScriptAction,
  HighlightStyle,
  ActionType,
} from "@appdemo/types";
import * as crypto from "crypto";

// ============================================
// Script Generator Configuration
// ============================================

interface ScriptGeneratorConfig {
  model: string;
  maxTokens: number;
}

const DEFAULT_CONFIG: ScriptGeneratorConfig = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
};

// ============================================
// Claude Response Schema
// ============================================

interface ClaudeScriptResponse {
  title: string;
  targetAudience: string;
  totalDuration: number;
  sections: Array<{
    name: string;
    narration: string;
    duration: number;
    actions: Array<{
      type: string;
      selector?: string;
      value?: string;
      timing: number;
      highlightStyle: string;
      highlightDuration?: number;
      highlightLabel?: string;
    }>;
  }>;
}

// ============================================
// Script Generator Class
// ============================================

export class ScriptGenerator {
  private client: Anthropic;
  private config: ScriptGeneratorConfig;

  constructor(config: Partial<ScriptGeneratorConfig> = {}) {
    this.client = new Anthropic();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generate(
    analysis: AppAnalysis,
    options: GenerateScriptOptions = {}
  ): Promise<DemoScript> {
    console.log("[ScriptGenerator] Generating demo script...");

    const {
      targetAudience = "SaaS professionals and product managers",
      focusAreas = [],
      tone = "professional",
      maxDuration = 120,
    } = options;

    // Build the prompt
    const prompt = this.buildPrompt(analysis, {
      targetAudience,
      focusAreas,
      tone,
      maxDuration,
    });

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const rawScript = JSON.parse(jsonMatch[0]) as ClaudeScriptResponse;

      // Transform to DemoScript format
      const script = this.transformScript(rawScript, targetAudience);

      console.log(
        `[ScriptGenerator] Generated ${script.sections.length} sections`
      );

      return script;
    } catch (error) {
      console.error("[ScriptGenerator] Error generating script:", error);

      // Return a fallback script based on analysis
      return this.generateFallbackScript(analysis, options);
    }
  }

  private buildPrompt(
    analysis: AppAnalysis,
    options: {
      targetAudience: string;
      focusAreas: string[];
      tone: string;
      maxDuration: number;
    }
  ): string {
    const { targetAudience, focusAreas, tone, maxDuration } = options;

    // Build feature summary
    const featureSummary = analysis.features
      .slice(0, 10)
      .map(
        (f, i) =>
          `${i + 1}. ${f.name} (importance: ${f.importance}/10) - ${f.description}`
      )
      .join("\n");

    // Build route summary
    const routeSummary = analysis.routes
      .slice(0, 5)
      .map((r) => `- ${r.title}: ${r.description} (${r.path})`)
      .join("\n");

    // Build flow summary
    const flowSummary = analysis.flows
      .map((f) => `- ${f.name}: ${f.steps.length} steps, ~${f.estimatedDuration}s`)
      .join("\n");

    return `You are an expert product demo scriptwriter creating engaging, professional demo videos.

## APP ANALYSIS

**Routes discovered:**
${routeSummary}

**Key features (sorted by importance):**
${featureSummary}

**Suggested user flows:**
${flowSummary}

## REQUIREMENTS

- **Target audience:** ${targetAudience}
- **Tone:** ${tone}
- **Max duration:** ${maxDuration} seconds
${focusAreas.length > 0 ? `- **Focus areas:** ${focusAreas.join(", ")}` : ""}

## SCRIPT GUIDELINES

1. **Hook (first 10-15 seconds):** Start with a compelling problem statement or value proposition
2. **Flow:** Organize the demo to show the most impressive/important features first
3. **Narration:** Write natural, conversational narration (aim for ~150 words per minute)
4. **Actions:** Include specific browser actions (click, scroll, type, navigate)
5. **Highlights:** Use visual highlights to draw attention:
   - "arrow" for pointing to buttons/links
   - "spotlight" for focusing on important areas
   - "box" for highlighting form fields or sections
   - "zoom" for detailed views
6. **Pacing:** Allow 3-5 seconds per action for viewer comprehension
7. **CTA:** End with a clear call-to-action

## OUTPUT FORMAT

Return ONLY valid JSON matching this structure:

{
  "title": "Demo title",
  "targetAudience": "${targetAudience}",
  "totalDuration": <total seconds>,
  "sections": [
    {
      "name": "Section Name",
      "narration": "What to say during this section",
      "duration": <seconds>,
      "actions": [
        {
          "type": "click|scroll|hover|type|wait|navigate",
          "selector": "CSS selector (if applicable)",
          "value": "value to type or URL (if applicable)",
          "timing": <milliseconds from section start>,
          "highlightStyle": "arrow|spotlight|box|zoom|none",
          "highlightDuration": <milliseconds>,
          "highlightLabel": "optional label text"
        }
      ]
    }
  ]
}

Generate a compelling demo script now:`;
  }

  private transformScript(
    raw: ClaudeScriptResponse,
    targetAudience: string
  ): DemoScript {
    const sections: ScriptSection[] = raw.sections.map((section, index) => ({
      id: crypto.randomUUID(),
      name: section.name,
      narration: section.narration,
      duration: section.duration,
      actions: section.actions.map((action) => ({
        type: this.normalizeActionType(action.type),
        selector: action.selector,
        value: action.value,
        timing: action.timing,
        highlightStyle: this.normalizeHighlightStyle(action.highlightStyle),
        highlightDuration: action.highlightDuration,
        highlightLabel: action.highlightLabel,
      })),
    }));

    // Calculate total duration
    const totalDuration = sections.reduce((sum, s) => sum + s.duration, 0);

    // Generate version section IDs
    const sectionIds = sections.map((s) => s.id);
    const versions = this.generateVersions(sectionIds, sections);

    return {
      title: raw.title,
      targetAudience,
      totalDuration,
      sections,
      versions,
    };
  }

  private normalizeActionType(type: string): ActionType {
    const validTypes: ActionType[] = [
      "click",
      "scroll",
      "hover",
      "type",
      "wait",
      "navigate",
    ];
    const normalized = type.toLowerCase() as ActionType;
    return validTypes.includes(normalized) ? normalized : "wait";
  }

  private normalizeHighlightStyle(style: string): HighlightStyle {
    const validStyles: HighlightStyle[] = [
      "arrow",
      "spotlight",
      "box",
      "zoom",
      "none",
    ];
    const normalized = style.toLowerCase() as HighlightStyle;
    return validStyles.includes(normalized) ? normalized : "none";
  }

  private generateVersions(
    sectionIds: string[],
    sections: ScriptSection[]
  ): { teaser: string[]; standard: string[]; full: string[] } {
    // Teaser: first section only (or first 30 seconds)
    const teaserSections: string[] = [];
    let teaserDuration = 0;
    for (const section of sections) {
      if (teaserDuration + section.duration <= 30) {
        teaserSections.push(section.id);
        teaserDuration += section.duration;
      } else {
        break;
      }
    }
    if (teaserSections.length === 0 && sectionIds.length > 0) {
      teaserSections.push(sectionIds[0]!);
    }

    // Standard: first 2 minutes
    const standardSections: string[] = [];
    let standardDuration = 0;
    for (const section of sections) {
      if (standardDuration + section.duration <= 120) {
        standardSections.push(section.id);
        standardDuration += section.duration;
      } else {
        break;
      }
    }
    if (standardSections.length === 0) {
      standardSections.push(...sectionIds.slice(0, 3));
    }

    // Full: all sections
    return {
      teaser: teaserSections,
      standard: standardSections,
      full: sectionIds,
    };
  }

  private generateFallbackScript(
    analysis: AppAnalysis,
    options: GenerateScriptOptions
  ): DemoScript {
    console.log("[ScriptGenerator] Using fallback script generation");

    const {
      targetAudience = "General audience",
      maxDuration = 120,
    } = options;

    const sections: ScriptSection[] = [];
    let currentTime = 0;

    // Introduction section
    const introSection: ScriptSection = {
      id: crypto.randomUUID(),
      name: "Introduction",
      narration:
        "Welcome to this product demo. Let me show you the key features that make this application stand out.",
      duration: 10,
      actions: [
        {
          type: "wait",
          timing: 0,
          highlightStyle: "none",
        },
      ],
    };
    sections.push(introSection);
    currentTime += 10;

    // Feature sections
    const topFeatures = analysis.features.slice(0, 5);
    for (const feature of topFeatures) {
      if (currentTime >= maxDuration - 15) break;

      const section: ScriptSection = {
        id: crypto.randomUUID(),
        name: feature.name,
        narration: `Let's look at ${feature.name}. ${feature.description}`,
        duration: 15,
        actions: [
          {
            type: "click",
            selector: feature.selectors[0],
            timing: 2000,
            highlightStyle: "arrow",
            highlightDuration: 2000,
          },
        ],
      };
      sections.push(section);
      currentTime += 15;
    }

    // Closing section
    const closingSection: ScriptSection = {
      id: crypto.randomUUID(),
      name: "Closing",
      narration:
        "Thank you for watching this demo. Get started today to experience these features yourself.",
      duration: 8,
      actions: [
        {
          type: "wait",
          timing: 0,
          highlightStyle: "none",
        },
      ],
    };
    sections.push(closingSection);

    const sectionIds = sections.map((s) => s.id);

    return {
      title: `${analysis.routes[0]?.title || "App"} Demo`,
      targetAudience,
      totalDuration: sections.reduce((sum, s) => sum + s.duration, 0),
      sections,
      versions: {
        teaser: sectionIds.slice(0, 1),
        standard: sectionIds.slice(0, 4),
        full: sectionIds,
      },
    };
  }
}

// ============================================
// Main Export Function
// ============================================

/**
 * Generates a demo script from app analysis using Claude AI.
 */
export async function generateScript(
  analysis: AppAnalysis,
  options: GenerateScriptOptions = {}
): Promise<DemoScript> {
  const generator = new ScriptGenerator();
  return generator.generate(analysis, options);
}
