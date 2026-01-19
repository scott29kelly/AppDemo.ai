// ============================================
// User & Authentication Types
// ============================================

export type UserPlan = "free" | "creator" | "pro" | "agency";

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name?: string;
}

// ============================================
// Project Types
// ============================================

export type ProjectStatus =
  | "draft"
  | "analyzing"
  | "analysis_complete"
  | "recording"
  | "rendering"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: ProjectStatus;
  appUrl: string;
  githubUrl: string | null;
  targetAudience: string | null;
  analysis: AppAnalysis | null;
  script: DemoScript | null;
  timingMetadata: TimingMetadata | null;
  videoTeaserUrl: string | null;
  videoStandardUrl: string | null;
  videoFullUrl: string | null;
  subtitlesUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  appUrl: string;
  githubUrl?: string;
  targetAudience?: string;
}

// ============================================
// Job Types
// ============================================

export type JobType = "analysis" | "recording" | "rendering";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: Date;
}

// ============================================
// Analysis Types
// ============================================

export interface Route {
  path: string;
  title: string;
  description: string;
  interactiveElements: InteractiveElement[];
}

export interface InteractiveElement {
  type: string;
  purpose: string;
  selector: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  importance: number;
  selectors: string[];
  screenshots: string[];
}

export interface UserFlow {
  id: string;
  name: string;
  steps: FlowStep[];
  estimatedDuration: number;
}

export interface FlowStep {
  order: number;
  action: string;
  selector?: string;
  description: string;
}

export interface Screenshot {
  id: string;
  path: string;
  route: string;
  timestamp: number;
}

export interface AppAnalysis {
  routes: Route[];
  features: Feature[];
  flows: UserFlow[];
  screenshots: Screenshot[];
  metadata: {
    analyzedAt: Date;
    duration: number;
    pagesVisited: number;
  };
}

// ============================================
// Script Types
// ============================================

export type ActionType = "click" | "scroll" | "hover" | "type" | "wait" | "navigate";
export type HighlightStyle = "arrow" | "spotlight" | "box" | "zoom" | "none";
export type ToneStyle = "professional" | "casual" | "technical";

export interface ScriptAction {
  type: ActionType;
  selector?: string;
  value?: string;
  timing: number;
  highlightStyle: HighlightStyle;
  highlightDuration?: number;
  highlightLabel?: string;
}

export interface ScriptSection {
  id: string;
  name: string;
  narration: string;
  duration: number;
  actions: ScriptAction[];
}

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

export interface GenerateScriptOptions {
  targetAudience?: string;
  focusAreas?: string[];
  tone?: ToneStyle;
  maxDuration?: number;
}

// ============================================
// Recording Types
// ============================================

export interface RecordingOptions {
  script: DemoScript;
  outputDir: string;
  resolution: Resolution;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface SectionTiming {
  id: string;
  startTime: number;
  endTime: number;
  narration: string;
}

export interface TimingMetadata {
  sections: SectionTiming[];
  totalDuration: number;
}

// ============================================
// Rendering Types
// ============================================

export interface RenderOptions {
  rawVideoPath: string;
  timingMetadata: TimingMetadata;
  script: DemoScript;
  branding: BrandingOptions;
  voice: VoiceOptions;
  outputDir: string;
}

export interface BrandingOptions {
  logoPath?: string;
  primaryColor: string;
}

export interface VoiceOptions {
  voiceId: string;
}

export interface RenderResult {
  videoPath: string;
  subtitlesPath: string;
}

// ============================================
// API Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Queue Types
// ============================================

export interface AnalysisJobData {
  projectId: string;
  appUrl: string;
  githubUrl?: string;
}

export interface RecordingJobData {
  projectId: string;
  script: DemoScript;
  resolution: Resolution;
}

export interface RenderingJobData {
  projectId: string;
  rawVideoPath: string;
  timingMetadata: TimingMetadata;
  script: DemoScript;
  voiceId: string;
}

export type JobData = AnalysisJobData | RecordingJobData | RenderingJobData;
