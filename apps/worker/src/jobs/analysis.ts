import { analyzeApp, generateScript } from "@appdemo/analysis";
import { db } from "@appdemo/database";
import type { AnalysisJobData } from "@appdemo/types";

export async function processAnalysisJob(data: AnalysisJobData) {
  const { projectId, appUrl } = data;

  console.log(`[Analysis Job] Analyzing ${appUrl} for project ${projectId}`);

  // Update project status
  await db.project.update({
    where: { id: projectId },
    data: { status: "analyzing" },
  });

  try {
    // Step 1: Analyze the app
    const analysis = await analyzeApp(appUrl);

    // Step 2: Generate script
    const script = await generateScript(analysis);

    // Update project with results
    await db.project.update({
      where: { id: projectId },
      data: {
        status: "analysis_complete",
        analysis: analysis as object,
        script: script as object,
      },
    });

    console.log(`[Analysis Job] Completed for project ${projectId}`);

    return { success: true, analysis, script };
  } catch (error) {
    await db.project.update({
      where: { id: projectId },
      data: { status: "failed" },
    });

    throw error;
  }
}
