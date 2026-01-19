import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: "test@appdemo.ai" },
    update: {},
    create: {
      email: "test@appdemo.ai",
      name: "Test User",
      plan: "free",
    },
  });

  console.log("Created test user:", testUser.email);

  // Create a sample project
  const sampleProject = await prisma.project.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: testUser.id,
      name: "Sample Demo Project",
      appUrl: "https://example.com",
      status: "draft",
    },
  });

  console.log("Created sample project:", sampleProject.name);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
