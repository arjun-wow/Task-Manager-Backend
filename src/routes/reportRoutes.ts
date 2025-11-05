import { Router } from "express";
import { PrismaClient, TaskStatus } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/reports
 * Optional query: ?projectId=number
 * Returns total task stats across all projects or a specific project.
 */
router.get("/", async (req, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    const where = projectId ? { projectId } : {};

    // Prisma counts grouped by TaskStatus enum
    const [toDo, inProgress, done, total] = await Promise.all([
      prisma.task.count({ where: { ...where, status: TaskStatus.TO_DO } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.DONE } }),
      prisma.task.count({ where }),
    ]);

    res.json({
      toDo,
      inProgress,
      done,
      total,
      completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
    });
  } catch (error) {
    console.error("Error generating task reports:", error);
    res.status(500).json({ error: "Failed to generate report data" });
  }
});

export default router;
