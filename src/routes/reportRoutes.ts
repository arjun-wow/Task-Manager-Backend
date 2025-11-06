import { Router } from "express";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { protect } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware
router.use(protect);

/**
 * GET /api/reports/summary
 * Returns overall task/project summary based on user role.
 */
router.get("/summary", async (req: any, res) => {
  try {
    const user = req.user;
    let where: any = {};

    // 🔒 Non-admin users see only their own tasks/projects
    if (user.role !== "ADMIN") {
      where = {
        OR: [
          { assigneeId: user.id },
          { project: { team: { some: { id: user.id } } } },
        ],
      };
    }

    const [toDo, inProgress, done, totalProjects, totalTasks] = await Promise.all([
      prisma.task.count({ where: { ...where, status: TaskStatus.TO_DO } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...where, status: TaskStatus.DONE } }),
      prisma.project.count(),
      prisma.task.count({ where }),
    ]);

    res.json({
      stats: {
        toDo,
        inProgress,
        done,
        totalTasks,
        totalProjects,
        completionRate: totalTasks === 0 ? 0 : Math.round((done / totalTasks) * 100),
      },
    });
  } catch (error) {
    console.error("Error generating report summary:", error);
    res.status(500).json({ error: "Failed to generate report data" });
  }
});

/**
 * (Optional) GET /api/reports?projectId=123
 * Returns report for a specific project.
 */
router.get("/", async (req: any, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const where = projectId ? { projectId } : {};

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
