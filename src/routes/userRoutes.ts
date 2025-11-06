import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/users
 * ✅ Any logged-in user can view all users and roles.
 * ❌ Only admins can modify or delete.
 */
router.get("/", protect, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
