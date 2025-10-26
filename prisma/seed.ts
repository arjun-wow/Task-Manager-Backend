import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // --- Users ---
  const users = await prisma.user.createMany({
    data: [
      { name: "Dana R.", email: "dana@example.com", role: "Project Manager" },
      { name: "Elon S.", email: "elon@example.com", role: "Key Account Planner" },
      { name: "Nancy W.", email: "nancy@example.com", role: "Account Manager" },
      { name: "James M.", email: "james@example.com", role: "Digital Manager" },
    ],
    skipDuplicates: true,
  });

  // --- Project ---
  const project = await prisma.project.create({
    data: {
      name: "Market Research 2024",
      description: "Comprehensive marketing strategy research and survey project.",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-06-30"),
      progress: 0.4,
      teamMembers: {
        connect: [{ email: "dana@example.com" }, { email: "elon@example.com" }],
      },
    },
  });

  // --- Tasks ---
  const task1 = await prisma.task.create({
    data: {
      title: "Survey Design",
      description: "Create survey structure and question flow.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2024-04-25"),
      projectId: project.id,
      assignees: {
        connect: [{ email: "dana@example.com" }],
      },
      subTasks: {
        create: [
          { title: "Question Drafting" },
          { title: "Team Review" },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Market Overview Keynote",
      description: "Prepare presentation for upcoming stakeholder meeting.",
      status: "PENDING",
      priority: "MEDIUM",
      dueDate: new Date("2024-05-10"),
      projectId: project.id,
      assignees: {
        connect: [{ email: "elon@example.com" }],
      },
    },
  });

  
  await prisma.comment.create({
    data: {
      content: "Remember to include last quarter’s data.",
      userId: (await prisma.user.findFirst({ where: { email: "elon@example.com" } }))!.id,
      taskId: task2.id,
    },
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
