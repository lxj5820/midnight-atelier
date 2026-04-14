import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma.js';

// 注意：Prisma 使用驼峰命名法 (createdAt, updatedAt)
// SQLite 使用下划线命名法 (created_at, updated_at)
// 以下接口保持与原有代码一致，使用下划线命名法

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  api_key: string;
  is_admin: number;
  compute_points: number;
  created_at: Date;
  updated_at: Date;
}

export interface SafeUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  api_key: string;
  is_admin: number;
  compute_points: number;
  created_at: Date;
  updated_at: Date;
}

export function toSafeUser(user: User): SafeUser {
  const { password_hash, ...safe } = user;
  return safe;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const user = await prisma.users.findUnique({ where: { email } });
  return user as User | undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const user = await prisma.users.findUnique({ where: { id } });
  return user as User | undefined;
}

export async function createUser(
  id: string,
  email: string,
  passwordHash: string,
  nickname: string,
  avatar: string = ''
): Promise<SafeUser> {
  const user = await prisma.users.create({
    data: {
      id,
      email,
      password_hash: passwordHash,
      nickname,
      avatar,
    },
  });
  return toSafeUser(user as User);
}

export async function updateUserProfile(
  id: string,
  updates: { nickname?: string; avatar?: string }
): Promise<SafeUser | undefined> {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) return undefined;

  const userUpdated = await prisma.users.update({
    where: { id },
    data: {
      nickname: updates.nickname ?? user.nickname,
      avatar: updates.avatar ?? user.avatar,
    },
  });
  return toSafeUser(userUpdated as User);
}

export async function updateUserApiKey(id: string, apiKey: string): Promise<SafeUser | undefined> {
  const user = await prisma.users.update({
    where: { id },
    data: { api_key: apiKey },
  });
  return toSafeUser(user as User);
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<SafeUser | undefined> {
  const user = await prisma.users.update({
    where: { id },
    data: { password_hash: passwordHash },
  });
  return toSafeUser(user as User);
}

// ========== Email Verification ==========

export interface EmailVerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: Date;
  created_at: Date;
  used: number;
}

export async function createVerificationCode(id: string, email: string, code: string, expiresAt: Date) {
  await prisma.email_verification_codes.create({
    data: {
      id,
      email,
      code,
      expires_at: expiresAt,
    },
  });
}

export async function findValidVerificationCode(email: string, code: string): Promise<EmailVerificationCode | undefined> {
  const verificationCode = await prisma.email_verification_codes.findFirst({
    where: {
      email,
      code,
      used: 0,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });
  return verificationCode as EmailVerificationCode | undefined;
}

export async function markVerificationCodeAsUsed(id: string) {
  await prisma.email_verification_codes.update({
    where: { id },
    data: { used: 1 },
  });
}

export async function deleteExpiredVerificationCodes() {
  await prisma.email_verification_codes.deleteMany({
    where: {
      expires_at: { lt: new Date() },
    },
  });
}

// ========== System Settings ==========

export async function getSystemSetting(key: string): Promise<string | undefined> {
  const setting = await prisma.system_settings.findUnique({ where: { key } });
  return setting?.value;
}

export async function setSystemSetting(key: string, value: string) {
  await prisma.system_settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const settings = await prisma.system_settings.findMany();
  return settings.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

// ========== Admin Functions ==========

export async function getAllUsers(): Promise<SafeUser[]> {
  const users = await prisma.users.findMany({ orderBy: { created_at: 'desc' } });
  return users.map(u => toSafeUser(u as User));
}

export async function deleteUserById(id: string): Promise<boolean> {
  try {
    await prisma.users.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateUserAdminStatus(id: string, isAdmin: number): Promise<SafeUser | undefined> {
  const user = await prisma.users.update({
    where: { id },
    data: { is_admin: isAdmin },
  });
  return toSafeUser(user as User);
}

// ========== Compute Points ==========

export async function getUserComputePoints(id: string): Promise<number> {
  const user = await prisma.users.findUnique({ where: { id } });
  return user?.compute_points ?? 0;
}

export async function updateUserComputePoints(id: string, points: number): Promise<SafeUser | undefined> {
  const user = await prisma.users.update({
    where: { id },
    data: { compute_points: points },
  });
  return toSafeUser(user as User);
}

export async function addUserComputePoints(id: string, points: number): Promise<SafeUser | undefined> {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) return undefined;
  return updateUserComputePoints(id, user.compute_points + points);
}

export async function deductUserComputePoints(id: string, points: number): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) return { success: false, error: '用户不存在' };

  if (user.compute_points < points) {
    return { success: false, error: '算力值不足' };
  }

  const updatedUser = await updateUserComputePoints(id, user.compute_points - points);
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
  created_at: Date;
}

export async function createComputePointLog(
  id: string,
  userId: string,
  amount: number,
  type: 'gift' | 'compensation' | 'deduct' | 'clear' | 'consume',
  reason: string,
  operatorId: string = ''
) {
  await prisma.compute_point_logs.create({
    data: {
      id,
      user_id: userId,
      amount,
      type,
      reason,
      operator_id: operatorId,
    },
  });
}

export async function getUserComputePointLogs(userId: string, type?: string, limit: number = 100, offset: number = 0): Promise<ComputePointLog[]> {
  const logs = await prisma.compute_point_logs.findMany({
    where: { user_id: userId, ...(type ? { type } : {}) },
    orderBy: { created_at: 'desc' },
    take: limit,
    skip: offset,
  });
  return logs as ComputePointLog[];
}

export async function getComputePointLogsCount(userId: string, type?: string): Promise<number> {
  return prisma.compute_point_logs.count({
    where: { user_id: userId, ...(type ? { type } : {}) },
  });
}

export async function adminGiftComputePoints(userId: string, points: number, reason: string, operatorId: string): Promise<SafeUser | undefined> {
  const user = await addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, points, 'gift', reason, operatorId);
  }
  return user;
}

export async function adminCompensateComputePoints(userId: string, points: number, reason: string, operatorId: string): Promise<SafeUser | undefined> {
  const user = await addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, points, 'compensation', reason, operatorId);
  }
  return user;
}

export async function adminDeductComputePoints(userId: string, points: number, reason: string, operatorId: string): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: '用户不存在' };

  if (user.compute_points < points) {
    return { success: false, error: '算力值不足' };
  }

  const updatedUser = await updateUserComputePoints(userId, user.compute_points - points);
  if (updatedUser) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, -points, 'deduct', reason, operatorId);
  }
  return { success: true, user: updatedUser };
}

export async function adminClearComputePoints(userId: string, reason: string, operatorId: string): Promise<SafeUser | undefined> {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) return undefined;

  const clearedAmount = user.compute_points;
  const updatedUser = await updateUserComputePoints(userId, 0);
  if (updatedUser) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, -clearedAmount, 'clear', reason, operatorId);
  }
  return updatedUser;
}

export async function consumeComputePoints(userId: string, points: number, reason: string): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
  const result = await deductUserComputePoints(userId, points);
  if (result.success && result.user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, -points, 'consume', reason, userId);
  }
  return result;
}

export async function compensateUserComputePoints(userId: string, points: number, reason: string): Promise<SafeUser | undefined> {
  const user = await addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, points, 'compensation', reason, userId);
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
  created_at: Date;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: Date;
  expire_date: Date;
  auto_renew: number;
  created_at: Date;
  updated_at: Date;
}

export async function getAllActivePlans(): Promise<SubscriptionPlan[]> {
  const plans = await prisma.subscription_plans.findMany({
    where: { is_active: 1 },
    orderBy: { sort_order: 'asc' },
  });
  return plans as SubscriptionPlan[];
}

export async function getPlanById(id: string): Promise<SubscriptionPlan | undefined> {
  const plan = await prisma.subscription_plans.findUnique({ where: { id } });
  return plan as SubscriptionPlan | undefined;
}

export async function getUserSubscriptions(userId: string): Promise<(UserSubscription & { plan_name: string; plan_price: number; plan_period: string })[]> {
  const subscriptions = await prisma.user_subscriptions.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: { subscription_plans: true },
  });

  return subscriptions.map(sub => ({
    id: sub.id,
    user_id: sub.user_id,
    plan_id: sub.plan_id,
    status: sub.status,
    start_date: sub.start_date,
    expire_date: sub.expire_date,
    auto_renew: sub.auto_renew,
    created_at: sub.created_at,
    updated_at: sub.updated_at,
    plan_name: (sub as any).subscription_plans?.name ?? '',
    plan_price: (sub as any).subscription_plans?.price ?? 0,
    plan_period: (sub as any).subscription_plans?.period ?? '',
  }));
}

export async function getUserActiveSubscription(userId: string): Promise<(UserSubscription & { plan_name: string; plan_price: number; plan_period: string }) | undefined> {
  const subscription = await prisma.user_subscriptions.findFirst({
    where: {
      user_id: userId,
      status: 'active',
      expire_date: { gt: new Date() },
    },
    orderBy: { expire_date: 'desc' },
    include: { subscription_plans: true },
  });

  if (!subscription) return undefined;

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    plan_id: subscription.plan_id,
    status: subscription.status,
    start_date: subscription.start_date,
    expire_date: subscription.expire_date,
    auto_renew: subscription.auto_renew,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
    plan_name: (subscription as any).subscription_plans?.name ?? '',
    plan_price: (subscription as any).subscription_plans?.price ?? 0,
    plan_period: (subscription as any).subscription_plans?.period ?? '',
  };
}

export async function createUserSubscription(id: string, userId: string, planId: string, expireDate: Date, autoRenew: number = 0): Promise<UserSubscription> {
  const subscription = await prisma.user_subscriptions.create({
    data: {
      id,
      user_id: userId,
      plan_id: planId,
      expire_date: expireDate,
      auto_renew: autoRenew,
    },
  });
  return subscription as UserSubscription;
}

export async function cancelUserSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await prisma.user_subscriptions.update({
      where: { id: subscriptionId },
      data: { status: 'cancelled' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function extendUserSubscription(subscriptionId: string, newExpireDate: Date): Promise<UserSubscription | undefined> {
  const subscription = await prisma.user_subscriptions.update({
    where: { id: subscriptionId },
    data: { expire_date: newExpireDate, status: 'active' },
  });
  return subscription as UserSubscription | undefined;
}

export async function deleteUserSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await prisma.user_subscriptions.delete({ where: { id: subscriptionId } });
    return true;
  } catch {
    return false;
  }
}

export async function addComputePointsToUser(userId: string, points: number): Promise<SafeUser | undefined> {
  return addUserComputePoints(userId, points);
}

// ========== Admin User Initialization ==========

export async function initializeAdminUser(): Promise<SafeUser | undefined> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin initialization');
    return undefined;
  }

  const existingAdmin = await findUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists`);
    return toSafeUser(existingAdmin);
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const user = await prisma.users.create({
      data: {
        id,
        email: adminEmail,
        password_hash: passwordHash,
        nickname: '管理员',
        is_admin: 1,
        compute_points: 0,
      },
    });

    console.log(`Admin user ${adminEmail} created successfully`);
    return toSafeUser(user as User);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    return undefined;
  }
}

// ========== Initialize Subscription Plans ==========

export async function initializeSubscriptionPlans() {
  const count = await prisma.subscription_plans.count();
  if (count === 0) {
    const plans = [
      { id: 'plan_monthly_basic', name: '入门版', price: 29, period: '月付', monthly_quota: 1900, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K']), concurrency: 2, extras: '[]', sort_order: 1 },
      { id: 'plan_monthly_standard', name: '基础版', price: 69, period: '月付', monthly_quota: 5200, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 3, extras: '[]', sort_order: 2 },
      { id: 'plan_monthly_premium', name: '高级版', price: 98, period: '月付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: '[]', sort_order: 3 },
      { id: 'plan_yearly_basic', name: '年付入门版', price: 319, period: '年付', monthly_quota: 1900, daily_sign_in: 15, qualities: JSON.stringify(['1K', '2K']), concurrency: 2, extras: '[]', sort_order: 4 },
      { id: 'plan_yearly_standard', name: '年付基础版', price: 799, period: '年付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: JSON.stringify(['无限画布(pro)', '助力AI学习成长1年']), sort_order: 5 },
      { id: 'plan_yearly_premium', name: '年付高级版', price: 1199, period: '年付', monthly_quota: 7700, daily_sign_in: 25, qualities: JSON.stringify(['1K', '2K', '4K']), concurrency: 4, extras: JSON.stringify(['无限画布(vip)', '助力AI学习成长1年', '优先咨询服务']), sort_order: 6 },
    ];

    for (const plan of plans) {
      await prisma.subscription_plans.create({ data: plan });
    }
    console.log('Subscription plans initialized');
  }
}
