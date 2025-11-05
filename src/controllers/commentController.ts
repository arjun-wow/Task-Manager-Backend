import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

/**
 * Fetch comments for a specific task
 */
export const getCommentsForTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: 'Task ID is required' });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: Number(taskId) },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.json(comments);
  } catch (err) {
    console.error('GET COMMENTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Add a new comment to a task
 */
export const addCommentToTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const authorId = (req.user as any)?.id; // use `as any` to bypass Prisma/User type mismatch

  if (!taskId || !content || !authorId) {
    return res
      .status(400)
      .json({ message: 'Task ID, content, and author ID are required' });
  }

  try {
    const newComment = await prisma.comment.create({
      data: {
        content,
        taskId: Number(taskId),
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error('ADD COMMENT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};
