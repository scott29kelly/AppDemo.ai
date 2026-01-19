import { db } from "@appdemo/database";

export async function createTRPCContext() {
  return {
    db,
    // TODO: Add user session in Phase 4
    user: null,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
