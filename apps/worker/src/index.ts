import { Worker } from "bullmq";

import { processAnalysisJob } from "./jobs/analysis";
import { processRecordingJob } from "./jobs/recording";
import { processRenderingJob } from "./jobs/rendering";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};

console.log("[Worker] Starting job processor...");

// Analysis Worker
const analysisWorker = new Worker(
  "analysis",
  async (job) => {
    console.log(`[Analysis Worker] Processing job ${job.id}`);
    return processAnalysisJob(job.data);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "2", 10),
  }
);

// Recording Worker
const recordingWorker = new Worker(
  "recording",
  async (job) => {
    console.log(`[Recording Worker] Processing job ${job.id}`);
    return processRecordingJob(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 1, // Recording is resource-intensive
  }
);

// Rendering Worker
const renderingWorker = new Worker(
  "rendering",
  async (job) => {
    console.log(`[Rendering Worker] Processing job ${job.id}`);
    return processRenderingJob(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 1, // Rendering is resource-intensive
  }
);

// Event handlers
const workers = [analysisWorker, recordingWorker, renderingWorker];

workers.forEach((worker) => {
  worker.on("completed", (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err);
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Received SIGTERM, shutting down...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

console.log("[Worker] Ready to process jobs");
