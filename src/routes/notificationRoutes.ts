import express from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// 🔒 All routes are protected
router.use(protect);

// 📬 Get all notifications for the logged-in user
router.get("/", async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ✅ Mark notification as read
router.put("/:id/read", async (req: any, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id: Number(id) },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
