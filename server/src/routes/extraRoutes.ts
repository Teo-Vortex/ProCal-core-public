import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getPrisma } from "../db/prisma";
import { buildIcsCalendar } from "../ics/calendar";

export const extraRouter = Router();

extraRouter.use(requireAuth);

extraRouter.get("/api/summary", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date();
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const prisma = getPrisma();

  const [events, myTasks, dueSoon] = await Promise.all([
    prisma.event.findMany({ where: { isDeleted: false, date: { gte: from, lte: to } }, orderBy: { date: "asc" }, take: 200 }),
    prisma.task.findMany({ where: { isDeleted: false, members: { some: { userId: req.auth!.userId } } }, orderBy: { dueAt: "asc" }, take: 200 }),
    prisma.task.findMany({ where: { isDeleted: false, dueAt: { gte: new Date(), lte: new Date(Date.now() + 72 * 3600 * 1000) } }, orderBy: { dueAt: "asc" }, take: 100 })
  ]);

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    events: events.map((e) => ({ id: e.id, date: e.date, title: e.title })),
    myTasks: myTasks.map((t) => ({ id: t.id, eventId: t.eventId, title: t.title, status: t.status, dueAt: t.dueAt })),
    dueSoon: dueSoon.map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt, status: t.status }))
  });
});

extraRouter.get("/api/calendar.ics", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date("1970-01-01T00:00:00.000Z");
  const to = req.query.to ? new Date(String(req.query.to)) : new Date("2100-01-01T00:00:00.000Z");
  const prisma = getPrisma();

  const events = await prisma.event.findMany({ where: { isDeleted: false, date: { gte: from, lte: to } } });
  const tasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      dueAt: { gte: from, lte: to },
      OR: [
        { ownerId: req.auth!.userId },
        { members: { some: { userId: req.auth!.userId } } }
      ]
    }
  });

  const ics = buildIcsCalendar(events, tasks);
  res.setHeader("content-type", "text/calendar; charset=utf-8");
  res.send(ics);
});

