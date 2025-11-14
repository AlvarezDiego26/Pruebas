import prisma from "./prisma";

export async function logAction(userId: number | null, action: string) {
  try {
    await prisma.log.create({
      data: {
        userId,
        action,
      },
    });
  } catch (err) {
    console.error("Error saving log:", err);
  }
}
