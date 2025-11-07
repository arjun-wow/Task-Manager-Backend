import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

router.get("/admin/stats", protect, async (req, res) => {
  try {
    const [totalUsers, totalProjects, totalTasks] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
    ]);
    res.json({ totalUsers, totalProjects, totalTasks });
  } catch (err) {
    console.error("Admin stats fetch failed:", err);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
});

export default router;
