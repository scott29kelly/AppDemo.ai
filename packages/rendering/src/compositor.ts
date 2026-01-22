import ffmpeg from "fluent-ffmpeg";
import { ElevenLabsClient } from "elevenlabs";
import * as fs from "fs";
import * as path from "path";
import type {
  RenderOptions,
  RenderResult,
  TimingMetadata,
  DemoScript,
  ScriptSection,
} from "@appdemo/types";

// ============================================
// Configuration
// ============================================

interface CompositorConfig {
  ffmpegPath?: string;
}

// Auto-detect FFmpeg on Windows (winget install location)
function findFfmpegPath(): string | undefined {
  if (process.platform !== "win32") return undefined;

  const wingetPath = path.join(
    process.env.LOCALAPPDATA || "",
    "Microsoft/WinGet/Packages"
  );

  if (fs.existsSync(wingetPath)) {
    const packages = fs.readdirSync(wingetPath);
    const ffmpegPkg = packages.find((p) => p.startsWith("Gyan.FFmpeg"));
    if (ffmpegPkg) {
      const pkgPath = path.join(wingetPath, ffmpegPkg);
      const builds = fs.readdirSync(pkgPath);
      const buildDir = builds.find((b) => b.startsWith("ffmpeg-"));
      if (buildDir) {
        const ffmpegExe = path.join(pkgPath, buildDir, "bin", "ffmpeg.exe");
        if (fs.existsSync(ffmpegExe)) {
          return ffmpegExe;
        }
      }
    }
  }

  return undefined;
}

interface AudioSegment {
  sectionId: string;
  audioPath: string;
  duration: number;
}

// ============================================
// Demo Compositor Class
// ============================================

export class DemoCompositor {
  private elevenlabs: ElevenLabsClient;
  private config: CompositorConfig;

  constructor(config: CompositorConfig = {}) {
    this.config = config;
    this.elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Set FFmpeg path - use provided path, auto-detect, or rely on PATH
    const ffmpegPath = config.ffmpegPath || findFfmpegPath();
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      console.log(`[Compositor] Using FFmpeg: ${ffmpegPath}`);
    }
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    const { rawVideoPath, timingMetadata, script, voice, outputDir } = options;

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`[Compositor] Starting render`);
    console.log(`[Compositor] Raw video: ${rawVideoPath}`);
    console.log(`[Compositor] Output dir: ${outputDir}`);
    console.log(`[Compositor] Voice ID: ${voice.voiceId}`);

    // 1. Generate narration audio for each section
    console.log(`[Compositor] Generating narration audio...`);
    const audioSegments = await this.generateNarration(script, voice.voiceId, outputDir);

    // 2. Combine audio segments with timing
    console.log(`[Compositor] Combining audio segments...`);
    const combinedAudioPath = await this.combineAudio(
      audioSegments,
      timingMetadata,
      outputDir
    );

    // 3. Composite video with audio
    console.log(`[Compositor] Compositing final video...`);
    const finalVideoPath = await this.compositeVideo({
      rawVideoPath,
      audioPath: combinedAudioPath,
      outputPath: path.join(outputDir, "final.mp4"),
    });

    // 4. Generate subtitles
    console.log(`[Compositor] Generating subtitles...`);
    const subtitlesPath = this.generateSubtitles(script, timingMetadata, outputDir);

    console.log(`[Compositor] Render complete!`);
    console.log(`[Compositor] Video: ${finalVideoPath}`);
    console.log(`[Compositor] Subtitles: ${subtitlesPath}`);

    return {
      videoPath: finalVideoPath,
      subtitlesPath,
    };
  }

  private async generateNarration(
    script: DemoScript,
    voiceId: string,
    outputDir: string
  ): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];
    const audioDir = path.join(outputDir, "audio");
    fs.mkdirSync(audioDir, { recursive: true });

    for (const section of script.sections) {
      if (!section.narration || section.narration.trim() === "") {
        console.log(`[Compositor] Skipping empty narration for section: ${section.name}`);
        continue;
      }

      const audioPath = path.join(audioDir, `narration-${section.id}.mp3`);

      console.log(`[Compositor] Generating audio for: ${section.name}`);

      try {
        // Use ElevenLabs to generate speech
        const audioStream = await this.elevenlabs.textToSpeech.convert(voiceId, {
          text: section.narration,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        });

        // Write audio stream to file
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
          chunks.push(Buffer.from(chunk));
        }
        const audioBuffer = Buffer.concat(chunks);
        fs.writeFileSync(audioPath, audioBuffer);

        // Get audio duration
        const duration = await this.getAudioDuration(audioPath);

        segments.push({
          sectionId: section.id,
          audioPath,
          duration,
        });

        console.log(`[Compositor] Audio generated: ${section.name} (${duration}ms)`);
      } catch (error) {
        console.error(`[Compositor] Failed to generate audio for ${section.name}:`, error);
        // Continue with other sections
      }
    }

    return segments;
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          // Default to 5 seconds if we can't probe
          resolve(5000);
          return;
        }
        const duration = (metadata.format.duration || 5) * 1000;
        resolve(duration);
      });
    });
  }

  private async combineAudio(
    segments: AudioSegment[],
    timing: TimingMetadata,
    outputDir: string
  ): Promise<string> {
    const outputPath = path.join(outputDir, "combined-audio.mp3");

    if (segments.length === 0) {
      // Create a silent audio file if no segments
      console.log(`[Compositor] No audio segments, creating silent track`);
      await this.createSilentAudio(outputPath, timing.totalDuration);
      return outputPath;
    }

    if (segments.length === 1) {
      // Just copy the single segment
      fs.copyFileSync(segments[0]!.audioPath, outputPath);
      return outputPath;
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add all audio inputs
      for (const segment of segments) {
        command = command.input(segment.audioPath);
      }

      // Build complex filter for positioning audio at correct timestamps
      const filters: string[] = [];
      const inputs: string[] = [];

      segments.forEach((segment, i) => {
        const sectionTiming = timing.sections.find((s) => s.id === segment.sectionId);
        if (!sectionTiming) return;

        const delayMs = sectionTiming.startTime;
        // adelay filter expects delay in milliseconds
        filters.push(`[${i}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
        inputs.push(`[a${i}]`);
      });

      if (inputs.length === 0) {
        // No valid inputs, create silent audio
        this.createSilentAudio(outputPath, timing.totalDuration)
          .then(() => resolve(outputPath))
          .catch(reject);
        return;
      }

      // Mix all audio streams
      filters.push(`${inputs.join("")}amix=inputs=${inputs.length}:duration=longest[out]`);

      command
        .complexFilter(filters)
        .outputOptions(["-map", "[out]"])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log(`[Compositor] FFmpeg command: ${cmd}`);
        })
        .on("end", () => {
          console.log(`[Compositor] Audio combined: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error(`[Compositor] Audio combine error:`, err);
          // Try to create silent audio as fallback
          this.createSilentAudio(outputPath, timing.totalDuration)
            .then(() => resolve(outputPath))
            .catch(reject);
        })
        .run();
    });
  }

  private async createSilentAudio(outputPath: string, durationMs: number): Promise<void> {
    const durationSec = durationMs / 1000;

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input("anullsrc=r=44100:cl=stereo")
        .inputFormat("lavfi")
        .duration(durationSec)
        .audioCodec("libmp3lame")
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
  }

  private async compositeVideo(options: {
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
          "-shortest", // Use shortest stream duration
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log(`[Compositor] FFmpeg composite: ${cmd}`);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`[Compositor] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log(`[Compositor] Video composited: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error(`[Compositor] Composite error:`, err);
          reject(err);
        })
        .run();
    });
  }

  private generateSubtitles(
    script: DemoScript,
    timing: TimingMetadata,
    outputDir: string
  ): string {
    const outputPath = path.join(outputDir, "subtitles.srt");

    let srt = "";
    let index = 1;

    for (const sectionTiming of timing.sections) {
      const scriptSection = script.sections.find((s) => s.id === sectionTiming.id);
      if (!scriptSection || !scriptSection.narration) continue;

      const startTime = this.formatSrtTime(sectionTiming.startTime);
      const endTime = this.formatSrtTime(sectionTiming.endTime);

      // Split long narrations into smaller chunks
      const words = scriptSection.narration.split(" ");
      const chunkSize = 12; // words per subtitle
      const chunks: string[] = [];

      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
      }

      const chunkDuration = (sectionTiming.endTime - sectionTiming.startTime) / chunks.length;

      chunks.forEach((chunk, i) => {
        const chunkStart = sectionTiming.startTime + i * chunkDuration;
        const chunkEnd = chunkStart + chunkDuration;

        srt += `${index}\n`;
        srt += `${this.formatSrtTime(chunkStart)} --> ${this.formatSrtTime(chunkEnd)}\n`;
        srt += `${chunk}\n\n`;
        index++;
      });
    }

    fs.writeFileSync(outputPath, srt);
    console.log(`[Compositor] Subtitles generated: ${outputPath}`);

    return outputPath;
  }

  private formatSrtTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)},${this.pad(milliseconds, 3)}`;
  }

  private pad(num: number, length: number = 2): string {
    return num.toString().padStart(length, "0");
  }
}

// ============================================
// Main Export Function
// ============================================

/**
 * Composites the final demo video with narration, audio, and subtitles.
 */
export async function renderDemo(options: RenderOptions): Promise<RenderResult> {
  const compositor = new DemoCompositor();
  return compositor.render(options);
}
