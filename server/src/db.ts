import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'atelier.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    is_admin INTEGER DEFAULT 0,
    compute_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 为已有数据库补充新增列
const userColumns = db.pragma('table_info(users)') as { name: string }[];
const columnNames = userColumns.map(c => c.name);
if (!columnNames.includes('compute_points')) {
  db.exec(`ALTER TABLE users ADD COLUMN compute_points INTEGER DEFAULT 0`);
}
if (!columnNames.includes('api_key')) {
  db.exec(`ALTER TABLE users ADD COLUMN api_key TEXT DEFAULT ''`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS email_verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
  ON email_verification_codes(email)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS compute_point_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reason TEXT DEFAULT '',
    operator_id TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_compute_point_logs_user_id
  ON compute_point_logs(user_id)
`);

// ========== Subscription Plans ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    period TEXT NOT NULL,
    monthly_quota INTEGER NOT NULL,
    daily_sign_in INTEGER NOT NULL,
    qualities TEXT NOT NULL,
    concurrency INTEGER NOT NULL,
    watermark INTEGER DEFAULT 1,
    extras TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ========== User Subscriptions ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expire_date DATETIME NOT NULL,
    auto_renew INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id)
`);

// 初始化套餐数据
const existingPlans = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get() as { count: number };
if (existingPlans.count === 0) {
  const plans = [
    { id: 'plan_monthly_basic', name: '入门版', price: 29, period: '月付', monthly_quota: 1900, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K']), concurrency: 2, extras: '[]', sort_order: 1 },
    { id: 'plan_monthly_standard', name: '基础版', price: 69, period: '月付', monthly_quota: 5200, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 3, extras: '[]', sort_order: 2 },
    { id: 'plan_monthly_premium', name: '高级版', price: 98, period: '月付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: '[]', sort_order: 3 },
    { id: 'plan_yearly_basic', name: '年付入门版', price: 319, period: '年付', monthly_quota: 1900, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K']), concurrency: 2, extras: '[]', sort_order: 4 },
    { id: 'plan_yearly_standard', name: '年付基础版', price: 799, period: '年付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: JSON.stringify(['无限画布(pro)', '助力AI学习成长1年']), sort_order: 5 },
    { id: 'plan_yearly_premium', name: '年付高级版', price: 1199, period: '年付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: JSON.stringify(['无限画布(vip)', '助力AI学习成长1年', '优先咨询服务']), sort_order: 6 },
  ];

  const insertPlan = db.prepare(`
    INSERT INTO subscription_plans (id, name, price, period, monthly_quota, daily_sign_in, qualities, concurrency, extras, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const plan of plans) {
    insertPlan.run(plan.id, plan.name, plan.price, plan.period, plan.monthly_quota, plan.daily_sign_in, plan.qualities, plan.concurrency, plan.extras, plan.sort_order);
  }
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  api_key: string;
  is_admin: number;
  compute_points: number;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  api_key: string;
  is_admin: number;
  compute_points: number;
  created_at: string;
  updated_at: string;
}

export function toSafeUser(user: User): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export function findUserByEmail(email: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
}

export function findUserById(id: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function createUser(
  id: string,
  email: string,
  passwordHash: string,
  nickname: string,
  avatar: string = ''
): SafeUser {
  const stmt = db.prepare(
    'INSERT INTO users (id, email, password_hash, nickname, avatar) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, email, passwordHash, nickname, avatar);
  return toSafeUser(findUserByEmail(email)!);
}

export function updateUserProfile(
  id: string,
  updates: { nickname?: string; avatar?: string }
): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const nickname = updates.nickname !== undefined ? updates.nickname : user.nickname;
  const avatar = updates.avatar !== undefined ? updates.avatar : user.avatar;
  const updatedAt = new Date().toISOString();

  const stmt = db.prepare(
    'UPDATE users SET nickname = ?, avatar = ?, updated_at = ? WHERE id = ?'
  );
  stmt.run(nickname, avatar, updatedAt, id);
  return toSafeUser(findUserById(id)!);
}

export function updateUserApiKey(id: string, apiKey: string): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const updatedAt = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET api_key = ?, updated_at = ? WHERE id = ?');
  stmt.run(apiKey, updatedAt, id);
  return toSafeUser(findUserById(id)!);
}

export function updateUserPassword(id: string, passwordHash: string): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const updatedAt = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
  stmt.run(passwordHash, updatedAt, id);
  return toSafeUser(findUserById(id)!);
}

// ========== Email Verification ==========

export interface EmailVerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  used: number;
}

export function createVerificationCode(id: string, email: string, code: string, expiresAt: string) {
  const stmt = db.prepare(
    'INSERT INTO email_verification_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, email, code, expiresAt);
}

export function findValidVerificationCode(email: string, code: string): EmailVerificationCode | undefined {
  const stmt = db.prepare(
    'SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1'
  );
  return stmt.get(email, code) as EmailVerificationCode | undefined;
}

export function markVerificationCodeAsUsed(id: string) {
  const stmt = db.prepare('UPDATE email_verification_codes SET used = 1 WHERE id = ?');
  stmt.run(id);
}

export function deleteExpiredVerificationCodes() {
  const stmt = db.prepare('DELETE FROM email_verification_codes WHERE expires_at < datetime("now")');
  stmt.run();
}

// ========== System Settings ==========

export function getSystemSetting(key: string): string | undefined {
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value;
}

export function setSystemSetting(key: string, value: string) {
  const updatedAt = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?'
  );
  stmt.run(key, value, updatedAt, value, updatedAt);
}

export function getAllSystemSettings(): Record<string, string> {
  const stmt = db.prepare('SELECT key, value FROM system_settings');
  const rows = stmt.all() as { key: string; value: string }[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

// ========== Admin Functions ==========

export function getAllUsers(): SafeUser[] {
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  const users = stmt.all() as User[];
  return users.map(toSafeUser);
}

export function deleteUserById(id: string): boolean {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateUserAdminStatus(id: string, isAdmin: number): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const updatedAt = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?');
  stmt.run(isAdmin, updatedAt, id);
  return toSafeUser(findUserById(id)!);
}

// ========== Compute Points ==========

export function getUserComputePoints(id: string): number {
  const user = findUserById(id);
  return user?.compute_points || 0;
}

export function updateUserComputePoints(id: string, points: number): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const updatedAt = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET compute_points = ?, updated_at = ? WHERE id = ?');
  stmt.run(points, updatedAt, id);
  return toSafeUser(findUserById(id)!);
}

export function addUserComputePoints(id: string, points: number): SafeUser | undefined {
  const user = findUserById(id);
  if (!user) return undefined;

  const newPoints = user.compute_points + points;
  return updateUserComputePoints(id, newPoints);
}

export function deductUserComputePoints(id: string, points: number): { success: boolean; user?: SafeUser; error?: string } {
  const user = findUserById(id);
  if (!user) return { success: false, error: '用户不存在' };

  if (user.compute_points < points) {
    return { success: false, error: '算力值不足' };
  }

  const newPoints = user.compute_points - points;
  const updatedUser = updateUserComputePoints(id, newPoints);
  return { success: true, user: updatedUser };
}

// ========== Compute Point Logs ==========

export interface ComputePointLog {
  id: string;
  user_id: string;
  amount: number;
  type: 'gift' | 'compensation' | 'deduct' | 'clear' | 'consume';
  reason: string;
  operator_id: string;
  created_at: string;
}

export function createComputePointLog(
  id: string,
  userId: string,
  amount: number,
  type: 'gift' | 'compensation' | 'deduct' | 'clear' | 'consume',
  reason: string,
  operatorId: string = ''
) {
  const stmt = db.prepare(
    'INSERT INTO compute_point_logs (id, user_id, amount, type, reason, operator_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, userId, amount, type, reason, operatorId);
}

export function getUserComputePointLogs(userId: string, type?: string, limit: number = 100, offset: number = 0): ComputePointLog[] {
  let query = 'SELECT * FROM compute_point_logs WHERE user_id = ?';
  const params: any[] = [userId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params) as ComputePointLog[];
}

export function getComputePointLogsCount(userId: string, type?: string): number {
  let query = 'SELECT COUNT(*) as count FROM compute_point_logs WHERE user_id = ?';
  const params: any[] = [userId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

export function adminGiftComputePoints(userId: string, points: number, reason: string, operatorId: string): SafeUser | undefined {
  const user = addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, points, 'gift', reason, operatorId);
  }
  return user;
}

export function adminCompensateComputePoints(userId: string, points: number, reason: string, operatorId: string): SafeUser | undefined {
  const user = addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, points, 'compensation', reason, operatorId);
  }
  return user;
}

export function adminDeductComputePoints(userId: string, points: number, reason: string, operatorId: string): { success: boolean; user?: SafeUser; error?: string } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: '用户不存在' };

  if (user.compute_points < points) {
    return { success: false, error: '算力值不足' };
  }

  const updatedUser = updateUserComputePoints(userId, user.compute_points - points);
  if (updatedUser) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, -points, 'deduct', reason, operatorId);
  }
  return { success: true, user: updatedUser };
}

export function adminClearComputePoints(userId: string, reason: string, operatorId: string): SafeUser | undefined {
  const user = findUserById(userId);
  if (!user) return undefined;

  const clearedAmount = user.compute_points;
  const updatedUser = updateUserComputePoints(userId, 0);
  if (updatedUser) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, -clearedAmount, 'clear', reason, operatorId);
  }
  return updatedUser;
}

export function consumeComputePoints(userId: string, points: number, reason: string): { success: boolean; user?: SafeUser; error?: string } {
  const result = deductUserComputePoints(userId, points);
  if (result.success && result.user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, -points, 'consume', reason, userId);
  }
  return result;
}

export function compensateUserComputePoints(userId: string, points: number, reason: string): SafeUser | undefined {
  const user = addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, points, 'compensation', reason, userId);
  }
  return user;
}

// ========== Subscription Plans ==========
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  monthly_quota: number;
  daily_sign_in: number;
  qualities: string;
  concurrency: number;
  watermark: number;
  extras: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  expire_date: string;
  auto_renew: number;
  created_at: string;
  updated_at: string;
}

export function getAllActivePlans(): SubscriptionPlan[] {
  const stmt = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC');
  return stmt.all() as SubscriptionPlan[];
}

export function getPlanById(id: string): SubscriptionPlan | undefined {
  const stmt = db.prepare('SELECT * FROM subscription_plans WHERE id = ?');
  return stmt.get(id) as SubscriptionPlan | undefined;
}

export function getUserSubscriptions(userId: string): (UserSubscription & { plan_name: string; plan_price: number; plan_period: string })[] {
  const stmt = db.prepare(`
    SELECT us.*, sp.name as plan_name, sp.price as plan_price, sp.period as plan_period
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ?
    ORDER BY us.created_at DESC
  `);
  return stmt.all(userId) as (UserSubscription & { plan_name: string; plan_price: number; plan_period: string })[];
}

export function getUserActiveSubscription(userId: string): (UserSubscription & { plan_name: string; plan_price: number; plan_period: string }) | undefined {
  const stmt = db.prepare(`
    SELECT us.*, sp.name as plan_name, sp.price as plan_price, sp.period as plan_period
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ? AND us.status = 'active' AND us.expire_date > datetime('now')
    ORDER BY us.expire_date DESC
    LIMIT 1
  `);
  return stmt.get(userId) as (UserSubscription & { plan_name: string; plan_price: number; plan_period: string }) | undefined;
}

export function createUserSubscription(id: string, userId: string, planId: string, expireDate: string, autoRenew: number = 0): UserSubscription {
  const stmt = db.prepare(`
    INSERT INTO user_subscriptions (id, user_id, plan_id, expire_date, auto_renew)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId, planId, expireDate, autoRenew);
  const result = db.prepare('SELECT * FROM user_subscriptions WHERE id = ?').get(id) as UserSubscription;
  return result;
}

export function cancelUserSubscription(subscriptionId: string): boolean {
  const stmt = db.prepare('UPDATE user_subscriptions SET status = ? WHERE id = ?');
  const result = stmt.run('cancelled', subscriptionId);
  return result.changes > 0;
}

export function extendUserSubscription(subscriptionId: string, newExpireDate: string): UserSubscription | undefined {
  const stmt = db.prepare('UPDATE user_subscriptions SET expire_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(newExpireDate, 'active', subscriptionId);
  return db.prepare('SELECT * FROM user_subscriptions WHERE id = ?').get(subscriptionId) as UserSubscription | undefined;
}

export function deleteUserSubscription(subscriptionId: string): boolean {
  const stmt = db.prepare('DELETE FROM user_subscriptions WHERE id = ?');
  const result = stmt.run(subscriptionId);
  return result.changes > 0;
}

export function addComputePointsToUser(userId: string, points: number): SafeUser | undefined {
  return addUserComputePoints(userId, points);
}

// ========== Admin User Initialization ==========

export function initializeAdminUser(): SafeUser | undefined {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin initialization');
    return undefined;
  }

  const existingAdmin = findUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists`);
    return toSafeUser(existingAdmin);
  }

  try {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    const stmt = db.prepare(
      'INSERT INTO users (id, email, password_hash, nickname, is_admin, compute_points) VALUES (?, ?, ?, ?, 1, 0)'
    );
    stmt.run(id, adminEmail, passwordHash, '管理员');

    console.log(`Admin user ${adminEmail} created successfully`);
    return toSafeUser(findUserByEmail(adminEmail)!);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    return undefined;
  }
}
