import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { type ScanReport } from "../domain/schemas.js";

export class ReportStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        run_id TEXT PRIMARY KEY,
        report_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        report_json TEXT NOT NULL
      )
    `);
  }

  save(report: ScanReport): void {
    const statement = this.db.prepare(`
      INSERT OR REPLACE INTO reports (run_id, report_token, created_at, report_json)
      VALUES (?, ?, ?, ?)
    `);
    statement.run(report.runId, report.reportToken ?? "", report.createdAt, JSON.stringify(report));
  }

  get(runId: string, token: string): ScanReport | undefined {
    const statement = this.db.prepare(`
      SELECT report_json FROM reports WHERE run_id = ? AND report_token = ?
    `);
    const row = statement.get(runId, token) as { report_json: string } | undefined;
    return row ? (JSON.parse(row.report_json) as ScanReport) : undefined;
  }
}

let singleton: ReportStore | undefined;

export function getReportStore(path: string): ReportStore {
  singleton ??= new ReportStore(path);
  return singleton;
}
