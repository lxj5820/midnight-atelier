import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'atelier.db');

export const db: DatabaseType = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    api_key TEXT UNIQUE NOT NULL,
    nickname TEXT DEFAULT 'NightShade_Artist',
    avatar TEXT DEFAULT '',
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS api_key_validation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL,
    is_valid INTEGER DEFAULT 0,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    author TEXT NOT NULL,
    author_avatar TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface User {
  id: string;
  api_key: string;
  nickname: string;
  avatar: string;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  user_id: string;
  author: string;
  author_avatar: string;
  image_url: string;
  description: string;
  type: 'published' | 'pending';
  created_at: string;
}

export function findUserByApiKey(apiKey: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE api_key = ?');
  return stmt.get(apiKey) as User | undefined;
}

export function createUser(id: string, apiKey: string, nickname: string, avatar: string = ''): User {
  const stmt = db.prepare(
    'INSERT INTO users (id, api_key, nickname, avatar) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, apiKey, nickname, avatar);
  return findUserByApiKey(apiKey)!;
}

export function updateUser(apiKey: string, updates: { nickname?: string; avatar?: string }): User | undefined {
  const user = findUserByApiKey(apiKey);
  if (!user) return undefined;

  if (updates.nickname !== undefined) {
    user.nickname = updates.nickname;
  }
  if (updates.avatar !== undefined) {
    user.avatar = updates.avatar;
  }
  user.updated_at = new Date().toISOString();

  const stmt = db.prepare(
    'UPDATE users SET nickname = ?, avatar = ?, updated_at = ? WHERE api_key = ?'
  );
  stmt.run(user.nickname, user.avatar, user.updated_at, apiKey);
  return user;
}

export function setUserAdmin(apiKey: string, isAdmin: boolean): User | undefined {
  const user = findUserByApiKey(apiKey);
  if (!user) return undefined;

  user.is_admin = isAdmin ? 1 : 0;
  user.updated_at = new Date().toISOString();

  const stmt = db.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE api_key = ?');
  stmt.run(user.is_admin, user.updated_at, apiKey);
  return user;
}

export function saveApiKeyValidation(apiKey: string, isValid: boolean): void {
  const stmt = db.prepare(
    'INSERT INTO api_key_validation (api_key, is_valid) VALUES (?, ?)'
  );
  stmt.run(apiKey, isValid ? 1 : 0);
}

export function getApiKeyValidation(apiKey: string): boolean | null {
  const stmt = db.prepare(
    'SELECT is_valid FROM api_key_validation WHERE api_key = ? ORDER BY validated_at DESC LIMIT 1'
  );
  const result = stmt.get(apiKey) as { is_valid: number } | undefined;
  return result ? result.is_valid === 1 : null;
}

export function createGalleryItem(
  id: string,
  userId: string,
  author: string,
  imageUrl: string,
  authorAvatar: string = '',
  description: string = ''
): GalleryItem {
  const stmt = db.prepare(
    'INSERT INTO gallery_items (id, user_id, author, author_avatar, image_url, description, type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, userId, author, authorAvatar, imageUrl, description, 'published');
  return getGalleryItemById(id)!;
}

export function getGalleryItemById(id: string): GalleryItem | undefined {
  const stmt = db.prepare(`
    SELECT
      id, user_id, author, author_avatar, image_url, description, type,
      created_at as createdAt
    FROM gallery_items
    WHERE id = ?
  `);
  return stmt.get(id) as GalleryItem | undefined;
}

export function getGalleryItems(limit: number = 50, offset: number = 0): GalleryItem[] {
  const stmt = db.prepare(`
    SELECT
      id, user_id, author, author_avatar, image_url, description, type,
      created_at as createdAt
    FROM gallery_items
    WHERE type = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all('published', limit, offset) as GalleryItem[];
}

export function getPendingGalleryItems(limit: number = 50, offset: number = 0): GalleryItem[] {
  const stmt = db.prepare(`
    SELECT
      id, user_id, author, author_avatar, image_url, description, type,
      created_at as createdAt
    FROM gallery_items
    WHERE type = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all('pending', limit, offset) as GalleryItem[];
}

export function getGalleryItemsByUser(userId: string): GalleryItem[] {
  const stmt = db.prepare(`
    SELECT
      id, user_id, author, author_avatar, image_url, description, type,
      created_at as createdAt
    FROM gallery_items
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId) as GalleryItem[];
}

export function updateGalleryItem(id: string, updates: { description?: string; type?: string }): GalleryItem | undefined {
  const item = getGalleryItemById(id);
  if (!item) return undefined;

  if (updates.description !== undefined) item.description = updates.description;
  if (updates.type !== undefined) item.type = updates.type as 'published' | 'pending';

  const stmt = db.prepare('UPDATE gallery_items SET description = ?, type = ? WHERE id = ?');
  stmt.run(item.description, item.type, id);
  return getGalleryItemById(id);
}

export function deleteGalleryItem(id: string): boolean {
  const stmt = db.prepare('DELETE FROM gallery_items WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}