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
};