import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserProfile,
  updateUserApiKey,
  updateUserPassword,
  toSafeUser,
  createVerificationCode,
  findValidVerificationCode,
  markVerificationCodeAsUsed,
  deleteExpiredVerificationCodes,
  getSystemSetting,
  setSystemSetting,
  getAllSystemSettings,
  getAllUsers,
  deleteUserById,
  updateUserAdminStatus,
  getUserComputePoints,
  addUserComputePoints,
  updateUserComputePoints,
  deductUserComputePoints,
  getUserComputePointLogs,
  getComputePointLogsCount,
  adminGiftComputePoints,
  adminCompensateComputePoints,
  adminDeductComputePoints,
  adminClearComputePoints,
  consumeComputePoints,
  compensateUserComputePoints,
  getAllActivePlans,
  getPlanById,
  getUserSubscriptions,
  getUserActiveSubscription,
  createUserSubscription,
  cancelUserSubscription,
  extendUserSubscription,
  deleteUserSubscription,
  addComputePointsToUser,
  createComputePointLog,
} from './db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from './middleware.js';
import { sendVerificationEmail, generateVerificationCode } from './email.js';

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function errorResponse(error: string): ApiResponse {
  return { success: false, error };
}

function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: !isRailway && process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: JWT_MAX_AGE,
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: !isRailway && process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

// ========== Auth Routes ==========

router.post('/auth/send-verification-code', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json(errorResponse('请输入有效的邮箱地址'));
  }

  try {
    deleteExpiredVerificationCodes();

    const code = generateVerificationCode();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    createVerificationCode(id, email.trim(), code, expiresAt);

    const sent = await sendVerificationEmail(email.trim(), code);
    if (!sent) {
      return res.status(500).json(errorResponse('发送验证码失败，请检查邮件服务配置'));
    }

    return res.json(successResponse({ sent: true }));
  } catch (error) {
    console.error('Send verification code error:', error);
    return res.status(500).json(errorResponse('发送验证码失败'));
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, nickname, verificationCode } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json(errorResponse('请输入有效的邮箱地址'));
  }
  if (!password || password.length < 6) {
    return res.status(400).json(errorResponse('密码长度至少为 6 位'));
  }
  if (!nickname || String(nickname).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入昵称'));
  }
  if (!verificationCode) {
    return res.status(400).json(errorResponse('请输入验证码'));
  }

  const trimmedNickname = String(nickname).trim();
  if (trimmedNickname.length > 50) {
    return res.status(400).json(errorResponse('昵称长度不能超过 50 字符'));
  }

  const existing = findUserByEmail(email.trim());
  if (existing) {
    return res.status(409).json(errorResponse('该邮箱已注册'));
  }

  const validCode = findValidVerificationCode(email.trim(), verificationCode);
  if (!validCode) {
    return res.status(400).json(errorResponse('验证码无效或已过期'));
  }

  try {
    markVerificationCodeAsUsed(validCode.id);

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUser(id, email.trim(), passwordHash, trimmedNickname);
    setAuthCookie(res, id);
    return res.status(201).json(successResponse(user));
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json(errorResponse('注册失败，请稍后重试'));
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(errorResponse('请输入邮箱和密码'));
  }

  const user = findUserByEmail(email.trim());
  if (!user) {
    return res.status(401).json(errorResponse('邮箱或密码错误'));
  }

  try {
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json(errorResponse('邮箱或密码错误'));
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, user.id);
    return res.json(successResponse({
      ...toSafeUser(user),
      token // Also return token in body for Authorization header
    }));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json(errorResponse('登录失败，请稍后重试'));
  }
});

router.post('/auth/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.json(successResponse({ loggedOut: true }));
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  return res.json(successResponse(req.user!));
});

// ========== User Routes ==========

router.put('/user/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { nickname, avatar } = req.body;
  const updates: { nickname?: string; avatar?: string } = {};

  if (nickname !== undefined) {
    const trimmed = String(nickname).trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
      return res.status(400).json(errorResponse('昵称长度必须在 1-50 字符之间'));
    }
    updates.nickname = trimmed;
  }

  if (avatar !== undefined) {
    const avatarStr = String(avatar).trim();
    if (avatarStr.length > 500) {
      return res.status(400).json(errorResponse('头像 URL 过长'));
    }
    if (avatarStr && !avatarStr.match(/^https?:\/\/.+/)) {
      return res.status(400).json(errorResponse('头像必须是有效的 HTTP(S) URL'));
    }
    updates.avatar = avatarStr;
  }

  const user = updateUserProfile(req.userId!, updates);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  return res.json(successResponse(user));
});

router.put('/user/api-key', authMiddleware, (req: AuthRequest, res: Response) => {
  const { apiKey } = req.body;

  if (apiKey === undefined || apiKey === null) {
    return res.status(400).json(errorResponse('请提供 API Key'));
  }

  const apiKeyStr = String(apiKey).trim();
  if (apiKeyStr.length === 0 || apiKeyStr.length > 500) {
    return res.status(400).json(errorResponse('API Key 长度必须在 1-500 字符之间'));
  }

  const user = updateUserApiKey(req.userId!, apiKeyStr);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  return res.json(successResponse(user));
});

router.put('/user/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json(errorResponse('请提供当前密码和至少 6 位的新密码'));
  }

  const user = findUserById(req.userId!);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json(errorResponse('当前密码错误'));
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const updated = updateUserPassword(req.userId!, newHash);
  if (!updated) {
    return res.status(500).json(errorResponse('修改密码失败'));
  }
  return res.json(successResponse({ updated: true }));
});

// ========== Compute Points Routes ==========

router.get('/user/compute-points', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const points = getUserComputePoints(req.userId!);
    return res.json(successResponse({ points }));
  } catch (error) {
    console.error('Get compute points error:', error);
    return res.status(500).json(errorResponse('获取算力值失败'));
  }
});

router.post('/user/deduct-compute-points', authMiddleware, (req: AuthRequest, res: Response) => {
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  try {
    const result = consumeComputePoints(req.userId!, points, reason || '生成图片消耗');
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '扣除算力值失败'));
    }
    return res.json(successResponse(result.user));
  } catch (error) {
    console.error('Deduct compute points error:', error);
    return res.status(500).json(errorResponse('扣除算力值失败'));
  }
});

router.post('/user/compensate-compute-points', authMiddleware, (req: AuthRequest, res: Response) => {
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  try {
    const user = compensateUserComputePoints(req.userId!, points, reason || '生成失败补偿');
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Compensate compute points error:', error);
    return res.status(500).json(errorResponse('补偿算力值失败'));
  }
});

router.get('/user/compute-points/logs', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = getUserComputePointLogs(req.userId!, type, limit, offset);
    const total = getComputePointLogsCount(req.userId!, type);

    return res.json(successResponse({ logs, total }));
  } catch (error) {
    console.error('Get compute point logs error:', error);
    return res.status(500).json(errorResponse('获取算力记录失败'));
  }
});

router.get('/user/subscription', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const activeSubscription = getUserActiveSubscription(req.userId!);
    if (activeSubscription) {
      return res.json(successResponse(activeSubscription));
    }
    return res.json(successResponse(null));
  } catch (error) {
    console.error('Get subscription error:', error);
    return res.status(500).json(errorResponse('获取订阅信息失败'));
  }
});

// ========== Admin Routes ==========

router.post('/admin/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { email, password, nickname } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json(errorResponse('请输入有效的邮箱地址'));
  }
  if (!password || password.length < 6) {
    return res.status(400).json(errorResponse('密码长度至少为 6 位'));
  }
  if (!nickname || String(nickname).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入昵称'));
  }

  const trimmedNickname = String(nickname).trim();
  if (trimmedNickname.length > 50) {
    return res.status(400).json(errorResponse('昵称长度不能超过 50 字符'));
  }

  const existing = findUserByEmail(email.trim());
  if (existing) {
    return res.status(409).json(errorResponse('该邮箱已注册'));
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUser(id, email.trim(), passwordHash, trimmedNickname);
    return res.status(201).json(successResponse(user));
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json(errorResponse('创建用户失败'));
  }
});

router.get('/admin/users', authMiddleware, adminMiddleware, (_req: AuthRequest, res: Response) => {
  try {
    const users = getAllUsers();
    return res.json(successResponse(users));
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json(errorResponse('获取用户列表失败'));
  }
});

router.put('/admin/settings', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from } = req.body;

  if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !smtp_from) {
    return res.status(400).json(errorResponse('请填写完整的 SMTP 配置'));
  }

  try {
    setSystemSetting('smtp_host', String(smtp_host).trim());
    setSystemSetting('smtp_port', String(smtp_port).trim());
    setSystemSetting('smtp_secure', smtp_secure ? 'true' : 'false');
    setSystemSetting('smtp_user', String(smtp_user).trim());
    setSystemSetting('smtp_pass', String(smtp_pass).trim());
    setSystemSetting('smtp_from', String(smtp_from).trim());

    return res.json(successResponse({ updated: true }));
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json(errorResponse('更新系统设置失败'));
  }
});

router.delete('/admin/users/:id', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (id === req.userId) {
    return res.status(400).json(errorResponse('不能删除自己的账号'));
  }

  try {
    const deleted = deleteUserById(id);
    if (!deleted) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json(errorResponse('删除用户失败'));
  }
});

router.put('/admin/users/:id/admin', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isAdmin } = req.body;

  if (typeof isAdmin !== 'number' || (isAdmin !== 0 && isAdmin !== 1)) {
    return res.status(400).json(errorResponse('isAdmin 必须为 0 或 1'));
  }

  if (id === req.userId) {
    return res.status(400).json(errorResponse('不能修改自己的管理员状态'));
  }

  try {
    const user = updateUserAdminStatus(id, isAdmin);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Update admin status error:', error);
    return res.status(500).json(errorResponse('更新管理员状态失败'));
  }
});

router.get('/admin/settings', authMiddleware, adminMiddleware, (_req: AuthRequest, res: Response) => {
  try {
    const settings = getAllSystemSettings();
    return res.json(successResponse(settings));
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json(errorResponse('获取系统设置失败'));
  }
});

router.put('/admin/users/:id/compute-points', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, action } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!action || !['add', 'set'].includes(action)) {
    return res.status(400).json(errorResponse('action 必须为 add 或 set'));
  }

  try {
    let user;
    if (action === 'add') {
      user = addUserComputePoints(id, points);
    } else {
      user = updateUserComputePoints(id, points);
    }

    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Update compute points error:', error);
    return res.status(500).json(errorResponse('更新算力值失败'));
  }
});

router.put('/admin/users/:id/api-key', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { apiKey } = req.body;

  if (apiKey === undefined || apiKey === null) {
    return res.status(400).json(errorResponse('请提供 API Key'));
  }

  const apiKeyStr = String(apiKey).trim();
  if (apiKeyStr.length === 0 || apiKeyStr.length > 500) {
    return res.status(400).json(errorResponse('API Key 长度必须在 1-500 字符之间'));
  }

  try {
    const user = updateUserApiKey(id, apiKeyStr);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Update API key error:', error);
    return res.status(500).json(errorResponse('更新 API Key 失败'));
  }
});

router.post('/admin/users/:id/compute-points/gift', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入赠送原因'));
  }

  try {
    const user = adminGiftComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Gift compute points error:', error);
    return res.status(500).json(errorResponse(`赠送算力值失败: ${error instanceof Error ? error.message : String(error)}`));
  }
});

router.post('/admin/users/:id/compute-points/compensate', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入补偿原因'));
  }

  try {
    const user = adminCompensateComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Compensate compute points error:', error);
    return res.status(500).json(errorResponse(`补偿算力值失败: ${error instanceof Error ? error.message : String(error)}`));
  }
});

router.post('/admin/users/:id/compute-points/deduct', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入扣除原因'));
  }

  try {
    const result = adminDeductComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '扣除算力值失败'));
    }
    return res.json(successResponse(result.user));
  } catch (error) {
    console.error('Deduct compute points error:', error);
    return res.status(500).json(errorResponse(`扣除算力值失败: ${error instanceof Error ? error.message : String(error)}`));
  }
});

router.post('/admin/users/:id/compute-points/clear', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { reason } = req.body;

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入清空原因'));
  }

  try {
    const user = adminClearComputePoints(id, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Clear compute points error:', error);
    return res.status(500).json(errorResponse(`清空算力值失败: ${error instanceof Error ? error.message : String(error)}`));
  }
});

// ========== Subscription Plans Routes ==========

router.get('/admin/plans', authMiddleware, adminMiddleware, (_req: AuthRequest, res: Response) => {
  try {
    const plans = getAllActivePlans();
    return res.json(successResponse(plans));
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json(errorResponse('获取套餐列表失败'));
  }
});

router.get('/admin/users/:id/subscriptions', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const subscriptions = getUserSubscriptions(id);
    const activeSubscription = getUserActiveSubscription(id);
    return res.json(successResponse({ subscriptions, activeSubscription }));
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    return res.status(500).json(errorResponse('获取用户订阅失败'));
  }
});

router.post('/admin/users/:id/subscriptions', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { planId, months } = req.body;

  if (!planId) {
    return res.status(400).json(errorResponse('请选择套餐'));
  }

  const plan = getPlanById(planId);
  if (!plan) {
    return res.status(404).json(errorResponse('套餐不存在'));
  }

  const durationMonths = months || (plan.period === '年付' ? 12 : 1);

  try {
    const subscriptionId = `sub_${uuidv4()}`;
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + durationMonths);

    const subscription = createUserSubscription(
      subscriptionId,
      id,
      planId,
      expireDate.toISOString(),
      0
    );

    // 开通套餐时赠送算力
    const monthlyPoints = plan.monthly_quota * durationMonths;
    addComputePointsToUser(id, monthlyPoints);

    // 记录算力赠送日志
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, id, monthlyPoints, 'gift', `开通套餐「${plan.name}」赠送`, req.userId!);

    return res.status(201).json(successResponse({ subscription, addedPoints: monthlyPoints }));
  } catch (error) {
    console.error('Create subscription error:', error);
    return res.status(500).json(errorResponse('开通套餐失败'));
  }
});

router.put('/admin/users/:userId/subscriptions/:subscriptionId/cancel', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

  try {
    const cancelled = cancelUserSubscription(subscriptionId);
    if (!cancelled) {
      return res.status(404).json(errorResponse('订阅不存在'));
    }
    return res.json(successResponse({ cancelled: true }));
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json(errorResponse('取消订阅失败'));
  }
});

router.put('/admin/users/:userId/subscriptions/:subscriptionId/extend', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;
  const { months } = req.body;

  if (!months || months <= 0) {
    return res.status(400).json(errorResponse('请输入有效的月数'));
  }

  try {
    const subscriptions = getUserSubscriptions(userId);
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json(errorResponse('订阅不存在'));
    }

    const plan = getPlanById(subscription.plan_id);
    if (!plan) {
      return res.status(404).json(errorResponse('套餐不存在'));
    }

    const currentExpire = new Date(subscription.expire_date);
    currentExpire.setMonth(currentExpire.getMonth() + months);

    const extended = extendUserSubscription(subscriptionId, currentExpire.toISOString());

    // 续费时赠送算力
    const monthlyPoints = plan.monthly_quota * months;
    addComputePointsToUser(userId, monthlyPoints);

    // 记录算力赠送日志
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    createComputePointLog(logId, userId, monthlyPoints, 'gift', `续费套餐「${plan.name}」赠送`, req.userId!);

    return res.json(successResponse({ extended, addedPoints: monthlyPoints }));
  } catch (error) {
    console.error('Extend subscription error:', error);
    return res.status(500).json(errorResponse('续费套餐失败'));
  }
});

router.delete('/admin/users/:userId/subscriptions/:subscriptionId', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

  try {
    const deleted = deleteUserSubscription(subscriptionId);
    if (!deleted) {
      return res.status(404).json(errorResponse('订阅不存在'));
    }
    return res.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete subscription error:', error);
    return res.status(500).json(errorResponse('删除订阅失败'));
  }
});

export default router;
