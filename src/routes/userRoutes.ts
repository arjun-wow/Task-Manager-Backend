import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middleware/auth";
import { updateUserProfile } from "../controllers/userController";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/users
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

/**
 * PUT /api/users/me
 * Allows logged-in user to update their own name/email
 */
router.put("/me", protect, updateUserProfile);

export default router;
