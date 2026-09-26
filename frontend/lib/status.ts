import type { Status } from "./types";

/** ボードの列（左から順に並べる） */
export const STATUSES: { key: Status; label: string; dotClass: string }[] = [
  { key: "unread", label: "未読", dotClass: "bg-status-unread" },
  { key: "reading", label: "読書中", dotClass: "bg-status-reading" },
  { key: "done", label: "読了", dotClass: "bg-status-done" },
];
