import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  getAllUsers,
  getTeamForUser,
  updateUserRole,
  deleteUser,
  updateUserProfile,
} from "../controllers/userController";

const router = Router();


router.get("/", protect, getAllUsers);


router.get("/team", protect, getTeamForUser);


router.put("/me", protect, updateUserProfile);


router.put("/:id/role", protect, updateUserRole);


router.delete("/:id", protect, deleteUser);

export default router;
