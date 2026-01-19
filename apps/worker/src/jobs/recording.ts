import { recordDemo } from "@appdemo/recording";
import { db } from "@appdemo/database";
import type { RecordingJobData } from "@appdemo/types";

export async function processRecordingJob(data: RecordingJobData) {
  const { projectId, script, resolution } = data;

  console.log(`[Recording Job] Recording demo for project ${projectId}`);

  // Update project status
  await db.project.update({
    where: { id: projectId },
    data: { status: "recording" },
  });

  try {
    const outputDir = `/tmp/appdemo/${projectId}/recording`;

    const result = await recordDemo({
      script,
      resolution,
      outputDir,
    });

    // Update project with timing metadata
    await db.project.update({
      where: { id: projectId },
      data: {
        timingMetadata: result.timingMetadata as object,
      },
    });

    console.log(`[Recording Job] Completed for project ${projectId}`);

    return { success: true, ...result };
  } catch (error) {
    await db.project.update({
      where: { id: projectId },
      data: { status: "failed" },
    });

    throw error;
  }
}
