import { createRequire } from "module";
import { mkdirSync } from "fs";
import path from "path";
import {
  AppState,
  CollectionResult,
  CompanyProfile,
  Opportunity,
  SavedOpportunity,
  Source
} from "@/lib/types";
import { initialProfile, sampleOpportunities, seedSources } from "@/lib/data/sample";
import { scoreOpportunities } from "@/lib/matching";
import { getOpportunityDedupeKey, sanitizeOpportunityForDisplay } from "@/lib/normalization";
import { normalizeCompanyProfile } from "@/lib/profile";
import { normalizeChecklist } from "@/lib/review";

type DatabaseSyncType = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
};

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSyncType };

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "projectradar.db");

let db: DatabaseSyncType | null = null;

function getDb(): DatabaseSyncType {
  if (db) {
    return db;
  }

  mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_profile (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_opportunities (
      opportunity_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      note TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      data TEXT NOT NULL,
      collected_at TEXT NOT NULL
    );
  `);
  ensureColumn(db, "saved_opportunities", "next_action_date", "TEXT");
  ensureColumn(db, "saved_opportunities", "owner_note", "TEXT");
  ensureColumn(db, "saved_opportunities", "exclude_reason", "TEXT");
  ensureColumn(db, "saved_opportunities", "checklist_json", "TEXT");
  ensureColumn(db, "saved_opportunities", "updated_at", "TEXT");

  seedIfEmpty(db);
  return db;
}

function ensureColumn(database: DatabaseSyncType, tableName: string, columnName: string, columnType: string): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  }
}

function seedIfEmpty(database: DatabaseSyncType): void {
  syncSeedSources(database);

  const profileCount = database.prepare("SELECT COUNT(*) AS count FROM app_profile").get() as { count: number };
  if (!profileCount.count) {
    database.prepare("INSERT INTO app_profile (id, data) VALUES ('default', ?)").run(JSON.stringify(normalizeCompanyProfile(initialProfile)));
  }

  const opportunityCount = database.prepare("SELECT COUNT(*) AS count FROM opportunities").get() as { count: number };
  if (!opportunityCount.count) {
    upsertOpportunities(sampleOpportunities, database);
  }
}

function syncSeedSources(database: DatabaseSyncType): void {
  const rows = database.prepare("SELECT id, data FROM sources").all() as Array<{ id: string; data: string }>;
  const existingSources = new Map(rows.map((row) => [row.id, JSON.parse(row.data) as Source]));
  const statement = database.prepare("INSERT OR REPLACE INTO sources (id, data) VALUES (?, ?)");

  seedSources.forEach((seedSource) => {
    const existing = existingSources.get(seedSource.id);
    const nextSource: Source = {
      ...seedSource,
      status: existing?.status || seedSource.status,
      lastCollectedAt: existing?.lastCollectedAt,
      lastCollectedCount: existing?.lastCollectedCount,
      lastDedupedCount: existing?.lastDedupedCount,
      lastStatusMessage: existing?.lastStatusMessage,
      lastError: existing?.lastError
    };
    statement.run(nextSource.id, JSON.stringify(nextSource));
  });
}

export function getSources(): Source[] {
  const rows = getDb().prepare("SELECT data FROM sources ORDER BY id").all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data) as Source);
}

export function updateSources(sources: Source[]): void {
  const database = getDb();
  const statement = database.prepare("INSERT OR REPLACE INTO sources (id, data) VALUES (?, ?)");
  sources.forEach((source) => statement.run(source.id, JSON.stringify(source)));
}

export function getOpportunities(): Opportunity[] {
  const rows = getDb()
    .prepare("SELECT data FROM opportunities ORDER BY updated_at DESC, id ASC")
    .all() as { data: string }[];
  const deduped = new Map<string, Opportunity>();
  rows.map((row) => {
    const opportunity = JSON.parse(row.data) as Opportunity;
    return sanitizeOpportunityForDisplay({
      ...opportunity,
      recordKind: opportunity.recordKind || "bid"
    });
  }).forEach((opportunity) => {
    const key = getOpportunityDedupeKey(opportunity);
    if (!deduped.has(key)) {
      deduped.set(key, opportunity);
    }
  });
  return Array.from(deduped.values());
}

export function upsertOpportunities(opportunities: Opportunity[], database = getDb()): void {
  const statement = database.prepare(
    "INSERT OR REPLACE INTO opportunities (id, source_id, data, updated_at) VALUES (?, ?, ?, ?)"
  );
  opportunities.forEach((opportunity) => {
    statement.run(opportunity.id, opportunity.sourceId, JSON.stringify(opportunity), new Date().toISOString());
  });
}

export function getProfile(): CompanyProfile {
  const row = getDb().prepare("SELECT data FROM app_profile WHERE id = 'default'").get() as { data: string } | undefined;
  return row ? normalizeCompanyProfile(JSON.parse(row.data) as CompanyProfile) : normalizeCompanyProfile(initialProfile);
}

export function updateProfile(profile: CompanyProfile): CompanyProfile {
  const normalized = normalizeCompanyProfile(profile);
  getDb()
    .prepare("INSERT OR REPLACE INTO app_profile (id, data) VALUES ('default', ?)")
    .run(JSON.stringify(normalized));
  return normalized;
}

export function getSavedOpportunities(): SavedOpportunity[] {
  const rows = getDb()
    .prepare(
      "SELECT opportunity_id, status, note, next_action_date, owner_note, exclude_reason, checklist_json, saved_at, updated_at FROM saved_opportunities ORDER BY saved_at DESC"
    )
    .all() as Array<{
      opportunity_id: string;
      status: string;
      note: string;
      next_action_date?: string;
      owner_note?: string;
      exclude_reason?: string;
      checklist_json?: string;
      saved_at: string;
      updated_at?: string;
    }>;
  return rows.map((row) => ({
    opportunityId: row.opportunity_id,
    status: normalizeSavedStatus(row.status),
    note: row.note,
    nextActionDate: row.next_action_date || undefined,
    ownerNote: row.owner_note || undefined,
    excludeReason: row.exclude_reason || undefined,
    checklist: normalizeChecklist(parseChecklist(row.checklist_json)),
    savedAt: row.saved_at,
    updatedAt: row.updated_at || undefined
  }));
}

function parseChecklist(value?: string): SavedOpportunity["checklist"] | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as SavedOpportunity["checklist"];
  } catch {
    return undefined;
  }
}

function normalizeSavedStatus(status: string): SavedOpportunity["status"] {
  if (status === "interested" || status === "contact-planned" || status === "excluded") {
    return status;
  }
  return "new";
}

export function saveOpportunity(saved: SavedOpportunity): SavedOpportunity[] {
  const updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO saved_opportunities
        (opportunity_id, status, note, next_action_date, owner_note, exclude_reason, checklist_json, saved_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      saved.opportunityId,
      saved.status,
      saved.note,
      saved.nextActionDate || "",
      saved.ownerNote || "",
      saved.excludeReason || "",
      JSON.stringify(normalizeChecklist(saved.checklist)),
      saved.savedAt,
      updatedAt
    );
  return getSavedOpportunities();
}

export function removeSavedOpportunity(opportunityId: string): SavedOpportunity[] {
  getDb().prepare("DELETE FROM saved_opportunities WHERE opportunity_id = ?").run(opportunityId);
  return getSavedOpportunities();
}

export function addCollectionResults(results: CollectionResult[]): void {
  const statement = getDb().prepare(
    "INSERT INTO collection_results (source_id, data, collected_at) VALUES (?, ?, ?)"
  );
  results.forEach((result) => {
    statement.run(result.sourceId, JSON.stringify(result), result.collectedAt);
  });
}

export function getCollectionResults(): CollectionResult[] {
  const rows = getDb()
    .prepare("SELECT data FROM collection_results ORDER BY collected_at DESC, id DESC LIMIT 40")
    .all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data) as CollectionResult);
}

export function getAppState(): AppState {
  const sources = getSources();
  const opportunities = getOpportunities();
  const profile = getProfile();
  return {
    sources,
    opportunities,
    profile,
    matches: scoreOpportunities(opportunities, profile),
    saved: getSavedOpportunities(),
    collectionResults: getCollectionResults()
  };
}
