import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.DATABASE_URL || "file:./db/custom.db",
    });
  }
  return _client;
}

async function ensureTable() {
  if (_initialized) return;
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS Image (
      id TEXT PRIMARY KEY,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      data BLOB NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Chunked-upload tables. Files bigger than the platform request-body limit
  // (Netlify/Vercel cap single requests at ~4.5-6MB) are split client-side
  // into chunks, stored here, then joined into Image on finalize.
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS UploadSession (
      id TEXT PRIMARY KEY,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS UploadChunk (
      sessionId TEXT NOT NULL,
      idx INTEGER NOT NULL,
      data BLOB NOT NULL,
      PRIMARY KEY (sessionId, idx)
    )
  `);
  _initialized = true;
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

export const db = {
  image: {
    async create({
      data,
    }: {
      data: {
        originalName: string;
        mimeType: string;
        size: number;
        width: number | null;
        height: number | null;
        data: Buffer | Uint8Array;
      };
    }) {
      await ensureTable();
      const id = generateId();
      const createdAt = new Date().toISOString();
      await getClient().execute({
        sql: "INSERT INTO Image (id, originalName, mimeType, size, width, height, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          id,
          data.originalName,
          data.mimeType,
          data.size,
          data.width,
          data.height,
          Buffer.from(data.data),
          createdAt,
        ],
      });
      return {
        id,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width,
        height: data.height,
        createdAt,
        url: `/api/images/${id}/file`,
      };
    },

    async findMany() {
      await ensureTable();
      const result = await getClient().execute(
        "SELECT id, originalName, mimeType, size, width, height, createdAt FROM Image ORDER BY createdAt DESC"
      );
      return result.rows.map((row) => ({
        id: row.id as string,
        originalName: row.originalName as string,
        mimeType: row.mimeType as string,
        size: Number(row.size),
        width: row.width ? Number(row.width) : null,
        height: row.height ? Number(row.height) : null,
        createdAt: row.createdAt as string,
      }));
    },

    async findUnique({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, boolean>;
    }) {
      await ensureTable();
      const columns = select ? Object.keys(select).join(", ") : "*";
      const result = await getClient().execute({
        sql: `SELECT ${columns} FROM Image WHERE id = ?`,
        args: [where.id],
      });
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      if (select?.data && row.data) {
        return { ...row, data: Buffer.from(row.data as Uint8Array) };
      }
      return row;
    },

    async delete({ where }: { where: { id: string } }) {
      await ensureTable();
      await getClient().execute({
        sql: "DELETE FROM Image WHERE id = ?",
        args: [where.id],
      });
    },
  },

  // Chunked upload support (see /api/upload/init and /api/upload/chunk)
  upload: {
    async createSession({
      data,
    }: {
      data: { id: string; originalName: string; mimeType: string; size: number };
    }) {
      await ensureTable();
      await getClient().execute({
        sql: "INSERT INTO UploadSession (id, originalName, mimeType, size, createdAt) VALUES (?, ?, ?, ?, ?)",
        args: [
          data.id,
          data.originalName,
          data.mimeType,
          data.size,
          new Date().toISOString(),
        ],
      });
    },

    async insertChunk({
      sessionId,
      index,
      data,
    }: {
      sessionId: string;
      index: number;
      data: Buffer | Uint8Array;
    }) {
      await ensureTable();
      // Single query: total received bytes + declared size (null if session missing)
      const result = await getClient().execute({
        sql: "SELECT COALESCE(SUM(length(c.data)), 0) AS total, s.size AS size FROM UploadSession s LEFT JOIN UploadChunk c ON c.sessionId = s.id WHERE s.id = ?",
        args: [sessionId],
      });
      const row = result.rows[0];
      if (!row || row.size === null || row.size === undefined) {
        throw new Error("Upload session not found");
      }
      const received = Number(row.total ?? 0);
      const declaredSize = Number(row.size);
      if (received + data.byteLength > declaredSize) {
        throw new Error("Received bytes exceed declared file size");
      }

      await getClient().execute({
        sql: "INSERT OR REPLACE INTO UploadChunk (sessionId, idx, data) VALUES (?, ?, ?)",
        args: [sessionId, index, Buffer.from(data)],
      });
    },

    async finalize({ sessionId }: { sessionId: string }) {
      await ensureTable();
      const session = await this.getSession({ where: { id: sessionId } });
      if (!session) return null;

      const result = await getClient().execute({
        sql: "SELECT idx, data FROM UploadChunk WHERE sessionId = ? ORDER BY idx ASC",
        args: [sessionId],
      });
      if (result.rows.length === 0) {
        throw new Error("No chunks received for this session");
      }

      const parts = result.rows.map((row) =>
        Buffer.from(row.data as Uint8Array)
      );
      const buffer = Buffer.concat(parts);

      if (buffer.length !== session.size) {
        throw new Error(
          `Size mismatch: received ${buffer.length} bytes, expected ${session.size}`
        );
      }

      const id = generateId();
      const createdAt = new Date().toISOString();
      await getClient().execute({
        sql: "INSERT INTO Image (id, originalName, mimeType, size, width, height, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          id,
          session.originalName,
          session.mimeType,
          session.size,
          null,
          null,
          buffer,
          createdAt,
        ],
      });

      // Cleanup chunk data after the file is safely stored
      await getClient().execute({
        sql: "DELETE FROM UploadChunk WHERE sessionId = ?",
        args: [sessionId],
      });
      await getClient().execute({
        sql: "DELETE FROM UploadSession WHERE id = ?",
        args: [sessionId],
      });

      return {
        id,
        originalName: session.originalName,
        mimeType: session.mimeType,
        size: session.size,
        width: null,
        height: null,
        createdAt,
        url: `/api/images/${id}/file`,
      };
    },

    async getSession({ where }: { where: { id: string } }) {
      await ensureTable();
      const result = await getClient().execute({
        sql: "SELECT id, originalName, mimeType, size FROM UploadSession WHERE id = ?",
        args: [where.id],
      });
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      return {
        id: row.id as string,
        originalName: row.originalName as string,
        mimeType: row.mimeType as string,
        size: Number(row.size),
      };
    },

    async cancel({ sessionId }: { sessionId: string }) {
      await ensureTable();
      await getClient().execute({
        sql: "DELETE FROM UploadChunk WHERE sessionId = ?",
        args: [sessionId],
      });
      await getClient().execute({
        sql: "DELETE FROM UploadSession WHERE id = ?",
        args: [sessionId],
      });
    },
  },
};
