import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET all tasks for current user (or all if admin)
 */
export const getTasks = async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const tasks =
      user.role === "ADMIN"
        ? await prisma.task.findMany({
            include: { assignee: true, project: true },
          })
        : await prisma.task.findMany({
            where: {
              OR: [
                { assigneeId: user.id },
                { project: { team: { some: { id: user.id } } } },
              ],
            },
            include: { assignee: true, project: true },
          });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

/**
 * CREATE a new task
 */
export const createTask = async (req: any, res: Response) => {
  try {
    const { title, description, projectId, priority, dueDate, assigneeId } = req.body;
    const user = req.user;

    if (!title || !projectId)
      return res.status(400).json({ error: "Title and projectId are required" });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        creatorId: user?.id || null, // ✅ optional, safe for now
      },
      include: {
        assignee: true,
        project: true,
      },
    });

    // ✅ Notification if assigned to someone
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `You have been assigned a new task: "${title}"`,
          type: "TASK_ASSIGNMENT",
        },
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

/**
 * UPDATE task details
 */
export const updateTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: true,
        project: true,
      },
    });

    // ✅ Notification for reassignment
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `You’ve been assigned an updated task: "${title}"`,
          type: "TASK_UPDATE",
        },
      });
    }

    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

/**
 * DELETE a task
 */
export const deleteTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};
