import Database from "better-sqlite3";
import os from "os";
import path from "path";

const DB_PATH = path.join(os.tmpdir(), "interacta.db");

declare global {
  var __interactaDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);

  db.pragma("foreign_keys = ON");

  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__interactaDb) {
    globalThis.__interactaDb = createDb();
  }

  return globalThis.__interactaDb;
}