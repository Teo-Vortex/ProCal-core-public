import { TaskStatus } from "@prisma/client";

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcsCalendar(events: Array<{ id: string; title: string; description?: string | null; date: Date }>, tasks: Array<{ id: string; title: string; description?: string | null; dueAt?: Date | null; status: TaskStatus }>): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProCal-C//LAN Calendar//EN",
    "CALSCALE:GREGORIAN"
  ];

  for (const evt of events) {
    const dt = evt.date;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${esc(evt.id)}@procal-c`);
    lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
    lines.push(`DTSTART:${toIcsDate(dt)}`);
    lines.push(`DTEND:${toIcsDate(new Date(dt.getTime() + 60 * 60 * 1000))}`);
    lines.push(`SUMMARY:${esc(evt.title)}`);
    if (evt.description) lines.push(`DESCRIPTION:${esc(evt.description)}`);
    lines.push("END:VEVENT");
  }

  for (const task of tasks) {
    if (!task.dueAt) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:task-${esc(task.id)}@procal-c`);
    lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
    lines.push(`DTSTART:${toIcsDate(task.dueAt)}`);
    lines.push(`DTEND:${toIcsDate(new Date(task.dueAt.getTime() + 30 * 60 * 1000))}`);
    lines.push(`SUMMARY:${esc(`TASK: ${task.title} [${task.status}]`)}`);
    if (task.description) lines.push(`DESCRIPTION:${esc(task.description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

