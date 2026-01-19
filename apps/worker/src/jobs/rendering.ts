import { renderDemo } from "@appdemo/rendering";
import { db } from "@appdemo/database";
import type { RenderingJobData } from "@appdemo/types";

export async function processRenderingJob(data: RenderingJobData) {
  const { projectId, rawVideoPath, timingMetadata, script, voiceId } = data;

  console.log(`[Rendering Job] Rendering demo for project ${projectId}`);

  // Update project status
  await db.project.update({
    where: { id: projectId },
    data: { status: "rendering" },
  });

  try {
    const outputDir = `/tmp/appdemo/${projectId}/output`;

    const result = await renderDemo({
      rawVideoPath,
      timingMetadata,
      script,
      branding: { primaryColor: "#3B82F6" },
      voice: { voiceId },
      outputDir,
    });

    // TODO: Upload to R2 and get URLs

    // Update project with video URLs
    await db.project.update({
      where: { id: projectId },
      data: {
        status: "completed",
        videoStandardUrl: result.videoPath,
        subtitlesUrl: result.subtitlesPath,
      },
    });

    console.log(`[Rendering Job] Completed for project ${projectId}`);

    return { success: true, ...result };
  } catch (error) {
    await db.project.update({
      where: { id: projectId },
      data: { status: "failed" },
    });

    throw error;
  }
}
