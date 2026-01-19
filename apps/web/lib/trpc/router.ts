import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  project: router({
    list: publicProcedure.query(async ({ ctx }) => {
      // TODO: Filter by user in Phase 4
      return ctx.db.project.findMany({
        orderBy: { createdAt: "desc" },
      });
    }),

    byId: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.project.findUnique({
          where: { id: input.id },
        });
      }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          appUrl: z.string().url(),
          githubUrl: z.string().url().optional(),
          targetAudience: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // TODO: Get user ID from session in Phase 4
        const userId = "00000000-0000-0000-0000-000000000000";

        return ctx.db.project.create({
          data: {
            ...input,
            userId,
          },
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
