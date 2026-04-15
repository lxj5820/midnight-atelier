import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

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
  created_at: string;
  updated_at: string;
}

export function toSafeUser(user: User): SafeUser {
  const { password_hash, ...safe } = user;
  return {
    ...safe,
    created_at: safe.created_at.toISOString(),
    updated_at: safe.updated_at.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ?? undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ?? undefined;
}

export async function createUser(
  id: string,
  email: string,
  passwordHash: string,
  nickname: string,
  avatar: string = ''
): Promise<SafeUser> {
  const user = await prisma.user.create({
    data: {
      id,
      email,
      password_hash: passwordHash,
      nickname,
      avatar,
    },
  });
  return toSafeUser(user);
}

export async function updateUserProfile(
  id: string,
  updates: { nickname?: string; avatar?: string }
): Promise<SafeUser | undefined> {
  const user = await prisma.user.update({
    where: { id },
    data: {
      nickname: updates.nickname,
      avatar: updates.avatar,
    },
  });
  return toSafeUser(user);
}

export async function updateUserApiKey(id: string, apiKey: string): Promise<SafeUser | undefined> {
  const user = await prisma.user.update({
    where: { id },
    data: { api_key: apiKey },
  });
  return toSafeUser(user);
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<SafeUser | undefined> {
  const user = await prisma.user.update({
    where: { id },
    data: { password_hash: passwordHash },
  });
  return toSafeUser(user);
}

// ========== Email Verification ==========

export async function createVerificationCode(id: string, email: string, code: string, expiresAt: Date) {
  await prisma.emailVerificationCode.create({
    data: {
      id,
      email,
      code,
      expiresAt,
    },
  });
}

export async function findValidVerificationCode(email: string, code: string) {
  const record = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  return record;
}

export async function markVerificationCodeAsUsed(id: string) {
  await prisma.emailVerificationCode.update({
    where: { id },
    data: { used: true },
  });
}

export async function deleteExpiredVerificationCodes() {
  await prisma.emailVerificationCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

// ========== System Settings ==========

export async function getSystemSetting(key: string): Promise<string | undefined> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value;
}

export async function setSystemSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const settings = await prisma.systemSetting.findMany();
  return settings.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

// ========== Admin Functions ==========

export async function getAllUsers(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  return users.map(toSafeUser);
}

export async function deleteUserById(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateUserAdminStatus(id: string, isAdmin: number): Promise<SafeUser | undefined> {
  const user = await prisma.user.update({
    where: { id },
    data: { is_admin: isAdmin },
  });
  return toSafeUser(user);
}

// ========== Compute Points ==========

export async function getUserComputePoints(id: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user?.compute_points || 0;
}

export async function updateUserComputePoints(id: string, points: number): Promise<SafeUser | undefined> {
  const user = await prisma.user.update({
    where: { id },
    data: { compute_points: points },
  });
  return toSafeUser(user);
}

export async function addUserComputePoints(id: string, points: number): Promise<SafeUser | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return undefined;
  return await updateUserComputePoints(id, user.compute_points + points);
}

export async function deductUserComputePoints(id: string, points: number) {
  // 使用原子操作：在同一 SQL 语句中检查余额并扣减，防止竞态条件
  try {
    const user = await prisma.user.update({
      where: {
        id,
        compute_points: { gte: points }, // 仅当余额 >= points 时才更新
      },
      data: {
        compute_points: { decrement: points }, // 原子递减
      },
    });
    return { success: true, user: toSafeUser(user) };
  } catch (error) {
    // 如果更新失败（余额不足或用户不存在），返回错误
    console.error('Deduct compute points error:', error);
    return { success: false, error: '算力值不足' };
  }
}

// ========== Compute Point Logs ==========

export async function createComputePointLog(
  id: string,
  userId: string,
  amount: number,
  type: 'gift' | 'compensation' | 'deduct' | 'clear' | 'consume',
  reason: string,
  operatorId: string = ''
) {
  await prisma.computePointLog.create({
    data: {
      id,
      userId,
      amount,
      type,
      reason,
      operatorId,
    },
  });
}

export async function getUserComputePointLogs(userId: string, type?: string, limit: number = 100, offset: number = 0) {
  const logs = await prisma.computePointLog.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
  return logs.map(log => ({
    ...log,
    created_at: log.createdAt.toISOString(),
  }));
}

export async function getComputePointLogsCount(userId: string, type?: string): Promise<number> {
  return await prisma.computePointLog.count({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
  });
}

export async function adminGiftComputePoints(userId: string, points: number, reason: string, operatorId: string) {
  const user = await addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, points, 'gift', reason, operatorId);
  }
  return user;
}

export async function adminCompensateComputePoints(userId: string, points: number, reason: string, operatorId: string) {
  const user = await addUserComputePoints(userId, points);
  if (user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, points, 'compensation', reason, operatorId);
  }
  return user;
}

export async function adminDeductComputePoints(userId: string, points: number, reason: string, operatorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
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

export async function adminClearComputePoints(userId: string, reason: string, operatorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return undefined;

  const clearedAmount = user.compute_points;
  const updatedUser = await updateUserComputePoints(userId, 0);
  if (updatedUser) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, -clearedAmount, 'clear', reason, operatorId);
  }
  return updatedUser;
}

export async function consumeComputePoints(userId: string, points: number, reason: string) {
  const result = await deductUserComputePoints(userId, points);
  if (result.success && result.user) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await createComputePointLog(logId, userId, -points, 'consume', reason, userId);
  }
  return result;
}

// 注意：compensateUserComputePoints 已删除，不再提供公开的补偿接口
// 如需补偿，请通过管理员后台手动操作

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

export async function getAllActivePlans(): Promise<SubscriptionPlan[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return plans.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    period: p.period,
    monthly_quota: p.monthlyQuota,
    daily_sign_in: p.dailySignIn,
    qualities: p.qualities,
    concurrency: p.concurrency,
    watermark: p.watermark ? 1 : 0,
    extras: p.extras,
    is_active: p.isActive ? 1 : 0,
    sort_order: p.sortOrder,
    created_at: p.createdAt.toISOString(),
  }));
}

export async function getPlanById(id: string) {
  const p = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!p) return undefined;
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    period: p.period,
    monthly_quota: p.monthlyQuota,
    daily_sign_in: p.dailySignIn,
    qualities: p.qualities,
    concurrency: p.concurrency,
    watermark: p.watermark ? 1 : 0,
    extras: p.extras,
    is_active: p.isActive ? 1 : 0,
    sort_order: p.sortOrder,
    created_at: p.createdAt.toISOString(),
  };
}

export async function getUserSubscriptions(userId: string) {
  const subs = await prisma.userSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });
  return subs.map(s => ({
    id: s.id,
    user_id: s.userId,
    plan_id: s.planId,
    status: s.status,
    start_date: s.startDate.toISOString(),
    expire_date: s.expireDate.toISOString(),
    auto_renew: s.autoRenew ? 1 : 0,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
    plan_name: s.plan.name,
    plan_price: s.plan.price,
    plan_period: s.plan.period,
  }));
}

export async function getUserActiveSubscription(userId: string) {
  const sub = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: 'active',
      expireDate: { gt: new Date() },
    },
    orderBy: { expireDate: 'desc' },
    include: { plan: true },
  });
  if (!sub) return undefined;
  return {
    id: sub.id,
    user_id: sub.userId,
    plan_id: sub.planId,
    status: sub.status,
    start_date: sub.startDate.toISOString(),
    expire_date: sub.expireDate.toISOString(),
    auto_renew: sub.autoRenew ? 1 : 0,
    created_at: sub.createdAt.toISOString(),
    updated_at: sub.updatedAt.toISOString(),
    plan_name: sub.plan.name,
    plan_price: sub.plan.price,
    plan_period: sub.plan.period,
    qualities: JSON.parse(sub.plan.qualities) as string[],
  };
}

export async function createUserSubscription(id: string, userId: string, planId: string, expireDate: Date, autoRenew: number = 0) {
  const sub = await prisma.userSubscription.create({
    data: {
      id,
      userId,
      planId,
      expireDate,
      autoRenew: autoRenew === 1,
    },
  });
  return {
    id: sub.id,
    user_id: sub.userId,
    plan_id: sub.planId,
    status: sub.status,
    start_date: sub.startDate.toISOString(),
    expire_date: sub.expireDate.toISOString(),
    auto_renew: sub.autoRenew ? 1 : 0,
    created_at: sub.createdAt.toISOString(),
    updated_at: sub.updatedAt.toISOString(),
  };
}

export async function cancelUserSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'cancelled' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function extendUserSubscription(subscriptionId: string, newExpireDate: Date) {
  const sub = await prisma.userSubscription.update({
    where: { id: subscriptionId },
    data: { expireDate: newExpireDate, status: 'active' },
  });
  return {
    id: sub.id,
    user_id: sub.userId,
    plan_id: sub.planId,
    status: sub.status,
    start_date: sub.startDate.toISOString(),
    expire_date: sub.expireDate.toISOString(),
    auto_renew: sub.autoRenew ? 1 : 0,
    created_at: sub.createdAt.toISOString(),
    updated_at: sub.updatedAt.toISOString(),
  };
}

export async function deleteUserSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await prisma.userSubscription.delete({ where: { id: subscriptionId } });
    return true;
  } catch {
    return false;
  }
}

export async function addComputePointsToUser(userId: string, points: number) {
  return await addUserComputePoints(userId, points);
}

// ========== Admin User Initialization ==========

export async function initializeAdminUser(): Promise<SafeUser | undefined> {
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'admin123';

  const existingAdmin = await findUserByEmail(adminEmail);
  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists`);
    return toSafeUser(existingAdmin);
  }

  try {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    const user = await prisma.user.create({
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
    return toSafeUser(user);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    return undefined;
  }
}

// ========== Initialize Subscription Plans ==========

export async function initializeSubscriptionPlans() {
  const existingPlans = await prisma.subscriptionPlan.count();
  if (existingPlans > 0) return;

  const plans = [
    { id: 'plan_monthly_basic', name: '入门版', price: 29, period: '月付', monthlyQuota: 1900, dailySignIn: 15, qualities: '["1K", "2K"]', concurrency: 2, extras: '[]', sortOrder: 1 },
    { id: 'plan_monthly_standard', name: '基础版', price: 69, period: '月付', monthlyQuota: 5200, dailySignIn: 15, qualities: '["1K", "2K", "4K"]', concurrency: 3, extras: '[]', sortOrder: 2 },
    { id: 'plan_monthly_premium', name: '高级版', price: 98, period: '月付', monthlyQuota: 7700, dailySignIn: 25, qualities: '["1K", "2K", "4K"]', concurrency: 4, extras: '[]', sortOrder: 3 },
    { id: 'plan_yearly_basic', name: '年付入门版', price: 319, period: '年付', monthlyQuota: 1900, dailySignIn: 15, qualities: '["1K", "2K"]', concurrency: 2, extras: '[]', sortOrder: 4 },
    { id: 'plan_yearly_standard', name: '年付基础版', price: 799, period: '年付', monthlyQuota: 7700, dailySignIn: 25, qualities: '["1K", "2K", "4K"]', concurrency: 4, extras: '["无限画布(pro)", "助力AI学习成长1年"]', sortOrder: 5 },
    { id: 'plan_yearly_premium', name: '年付高级版', price: 1199, period: '年付', monthlyQuota: 7700, dailySignIn: 25, qualities: '["1K", "2K", "4K"]', concurrency: 4, extras: '["无限画布(vip)", "助力AI学习成长1年", "优先咨询服务"]', sortOrder: 6 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.create({ data: plan });
  }
  console.log('Subscription plans initialized');
}

// ========== Subscription Plan CRUD ==========

export interface PlanInput {
  id: string;
  name: string;
  price: number;
  period: string;
  monthlyQuota: number;
  dailySignIn: number;
  qualities: string;
  concurrency: number;
  watermark?: boolean;
  extras?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createSubscriptionPlan(plan: PlanInput) {
  const result = await prisma.subscriptionPlan.create({
    data: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      monthlyQuota: plan.monthlyQuota,
      dailySignIn: plan.dailySignIn,
      qualities: plan.qualities,
      concurrency: plan.concurrency,
      watermark: plan.watermark ?? true,
      extras: plan.extras ?? '[]',
      isActive: plan.isActive ?? true,
      sortOrder: plan.sortOrder ?? 0,
    },
  });
  return {
    id: result.id,
    name: result.name,
    price: result.price,
    period: result.period,
    monthly_quota: result.monthlyQuota,
    daily_sign_in: result.dailySignIn,
    qualities: result.qualities,
    concurrency: result.concurrency,
    watermark: result.watermark ? 1 : 0,
    extras: result.extras,
    is_active: result.isActive ? 1 : 0,
    sort_order: result.sortOrder,
    created_at: result.createdAt.toISOString(),
  };
}

export async function updateSubscriptionPlan(id: string, updates: Partial<PlanInput>) {
  const result = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.period !== undefined && { period: updates.period }),
      ...(updates.monthlyQuota !== undefined && { monthlyQuota: updates.monthlyQuota }),
      ...(updates.dailySignIn !== undefined && { dailySignIn: updates.dailySignIn }),
      ...(updates.qualities !== undefined && { qualities: updates.qualities }),
      ...(updates.concurrency !== undefined && { concurrency: updates.concurrency }),
      ...(updates.watermark !== undefined && { watermark: updates.watermark }),
      ...(updates.extras !== undefined && { extras: updates.extras }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      ...(updates.sortOrder !== undefined && { sortOrder: updates.sortOrder }),
    },
  });
  return {
    id: result.id,
    name: result.name,
    price: result.price,
    period: result.period,
    monthly_quota: result.monthlyQuota,
    daily_sign_in: result.dailySignIn,
    qualities: result.qualities,
    concurrency: result.concurrency,
    watermark: result.watermark ? 1 : 0,
    extras: result.extras,
    is_active: result.isActive ? 1 : 0,
    sort_order: result.sortOrder,
    created_at: result.createdAt.toISOString(),
  };
}

export async function deleteSubscriptionPlan(id: string): Promise<boolean> {
  try {
    await prisma.subscriptionPlan.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getAllPlansIncludingInactive(): Promise<SubscriptionPlan[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return plans.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    period: p.period,
    monthly_quota: p.monthlyQuota,
    daily_sign_in: p.dailySignIn,
    qualities: p.qualities,
    concurrency: p.concurrency,
    watermark: p.watermark ? 1 : 0,
    extras: p.extras,
    is_active: p.isActive ? 1 : 0,
    sort_order: p.sortOrder,
    created_at: p.createdAt.toISOString(),
  }));
}

// ========== Email Templates ==========

const EMAIL_TEMPLATES = {
  verification_code: 'verification_code',
};

export async function getEmailTemplate(key: string): Promise<string | undefined> {
  return await getSystemSetting(`email_template_${key}`);
}

export async function setEmailTemplate(key: string, value: string) {
  await setSystemSetting(`email_template_${key}`, value);
}

export async function getAllEmailTemplates(): Promise<Record<string, string>> {
  const settings = await getAllSystemSettings();
  const templates: Record<string, string> = {};
  for (const key of Object.keys(settings)) {
    if (key.startsWith('email_template_')) {
      templates[key.replace('email_template_', '')] = settings[key];
    }
  }
  return templates;
}

export async function updateEmailTemplates(templates: Record<string, string>) {
  for (const [key, value] of Object.entries(templates)) {
    await setEmailTemplate(key, value);
  }
}
