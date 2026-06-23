import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { buildHolidayOccurrencesFromConfig, loadHolidayRules } from "../services/holidayRulesService";

export const holidayRouter = Router();

holidayRouter.use(requireAuth);

holidayRouter.get("/api/holidays", async (req, res) => {
  const from = String((req.query.from as string) || "").trim();
  const to = String((req.query.to as string) || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json({ error: "Invalid date range" });
    return;
  }
  if (from > to) {
    res.status(400).json({ error: "Invalid date range" });
    return;
  }

  const cfg = loadHolidayRules();
  const items = buildHolidayOccurrencesFromConfig(cfg, from, to);
  res.json({ items, updatedAt: cfg.updatedAt || "" });
});
