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
  refundComputePoints,
  dailySignIn,
  getAllActivePlans,
  getAllPlansIncludingInactive,
  getPlanById,
  getUserSubscriptions,
  getUserActiveSubscription,
  createUserSubscription,
  cancelUserSubscription,
  extendUserSubscription,
  deleteUserSubscription,
  addComputePointsToUser,
  createComputePointLog,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAllEmailTemplates,
  updateEmailTemplates,
  createGenerationLog,
  getGenerationLogs,
  prisma,
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
    await deleteExpiredVerificationCodes();

    const code = generateVerificationCode();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await createVerificationCode(id, email.trim(), code, expiresAt);

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

// 公开接口：获取注册开关状态（无需登录）
router.get('/public/registration-status', async (_req: Request, res: Response) => {
  try {
    const registrationEnabled = await getSystemSetting('registration_enabled');
    return res.json(successResponse({
      registration_enabled: registrationEnabled !== 'false'
    }));
  } catch (error) {
    console.error('Get registration status error:', error);
    return res.status(500).json(errorResponse('获取注册状态失败'));
  }
});

// 公开接口：获取默认API密钥（无需登录）
router.get('/public/default-api-key', async (_req: Request, res: Response) => {
  try {
    const defaultApiKey = await getSystemSetting('default_api_key');
    return res.json(successResponse({
      default_api_key: defaultApiKey || ''
    }));
  } catch (error) {
    console.error('Get default API key error:', error);
    return res.status(500).json(errorResponse('获取默认API密钥失败'));
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, nickname, verificationCode } = req.body;

  // 检查注册开关
  const registrationEnabled = await getSystemSetting('registration_enabled');
  if (registrationEnabled === 'false') {
    return res.status(403).json(errorResponse('当前已关闭注册功能'));
  }

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

  const existing = await findUserByEmail(email.trim());
  if (existing) {
    return res.status(409).json(errorResponse('该邮箱已注册'));
  }

  const validCode = await findValidVerificationCode(email.trim(), verificationCode);
  if (!validCode) {
    return res.status(400).json(errorResponse('验证码无效或已过期'));
  }

  try {
    await markVerificationCodeAsUsed(validCode.id);

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(id, email.trim(), passwordHash, trimmedNickname);
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

  const user = await findUserByEmail(email.trim());
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

router.put('/user/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
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

  const user = await updateUserProfile(req.userId!, updates);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }
  return res.json(successResponse(user));
});

router.put('/user/api-key', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { apiKey } = req.body;

  if (apiKey === undefined || apiKey === null) {
    return res.status(400).json(errorResponse('请提供 API Key'));
  }

  const apiKeyStr = String(apiKey).trim();
  if (apiKeyStr.length === 0 || apiKeyStr.length > 500) {
    return res.status(400).json(errorResponse('API Key 长度必须在 1-500 字符之间'));
  }

  const user = await updateUserApiKey(req.userId!, apiKeyStr);
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

  const user = await findUserById(req.userId!);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json(errorResponse('当前密码错误'));
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const updated = await updateUserPassword(req.userId!, newHash);
  if (!updated) {
    return res.status(500).json(errorResponse('修改密码失败'));
  }
  return res.json(successResponse({ updated: true }));
});

// ========== Compute Points Routes ==========

router.get('/user/compute-points', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const points = await getUserComputePoints(req.userId!);
    return res.json(successResponse({ points }));
  } catch (error) {
    console.error('Get compute points error:', error);
    return res.status(500).json(errorResponse('获取算力值失败'));
  }
});

router.post('/user/deduct-compute-points', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { points, reason, model, type } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  try {
    const result = await consumeComputePoints(req.userId!, points, reason || '生成图片消耗');
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '扣除算力值失败'));
    }

    // 记录生图日志
    if (model && type) {
      const logId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      await createGenerationLog(logId, req.userId!, model, type, points);
    }

    return res.json(successResponse(result.user));
  } catch (error) {
    console.error('Deduct compute points error:', error);
    return res.status(500).json(errorResponse('扣除算力值失败'));
  }
});

// 退款接口：允许用户退换最近5分钟内的消费
router.post('/user/refund-compute-points', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;

  try {
    const result = await refundComputePoints(req.userId!, reason || '生成失败退款');
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '退款失败'));
    }
    return res.json(successResponse({ refunded: result.refunded }));
  } catch (error) {
    console.error('Refund compute points error:', error);
    return res.status(500).json(errorResponse('退款失败'));
  }
});

// 每日签到
router.post('/user/daily-sign-in', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await dailySignIn(req.userId!);
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '签到失败'));
    }
    if (result.signedIn) {
      return res.json(successResponse({ signedIn: true, message: '今日已签到' }));
    }
    return res.json(successResponse({ signedIn: false, points: result.points }));
  } catch (error) {
    console.error('Daily sign-in error:', error);
    return res.status(500).json(errorResponse('签到失败'));
  }
});

// 注意：compensateUserComputePoints 已从 db.ts 移除，不再提供公开的补偿接口
// 算力扣除失败时会在 deductComputePoints 内部自动回滚

router.get('/user/compute-points/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await getUserComputePointLogs(req.userId!, type, limit, offset, startDate, endDate);
    const total = await getComputePointLogsCount(req.userId!, type);

    return res.json(successResponse({ logs, total }));
  } catch (error) {
    console.error('Get compute point logs error:', error);
    return res.status(500).json(errorResponse('获取算力记录失败'));
  }
});

router.get('/user/subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const activeSubscription = await getUserActiveSubscription(req.userId!);
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

  const existing = await findUserByEmail(email.trim());
  if (existing) {
    return res.status(409).json(errorResponse('该邮箱已注册'));
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(id, email.trim(), passwordHash, trimmedNickname);
    return res.status(201).json(successResponse(user));
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json(errorResponse('创建用户失败'));
  }
});

router.get('/admin/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    return res.json(successResponse(users));
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json(errorResponse('获取用户列表失败'));
  }
});

router.put('/admin/settings', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, registration_enabled, default_api_key } = req.body;

  try {
    // Validate SMTP if any SMTP field is provided
    if (smtp_host || smtp_port || smtp_user || smtp_pass || smtp_from) {
      if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !smtp_from) {
        return res.status(400).json(errorResponse('请填写完整的 SMTP 配置'));
      }
      await setSystemSetting('smtp_host', String(smtp_host).trim());
      await setSystemSetting('smtp_port', String(smtp_port).trim());
      await setSystemSetting('smtp_secure', smtp_secure ? 'true' : 'false');
      await setSystemSetting('smtp_user', String(smtp_user).trim());
      await setSystemSetting('smtp_pass', String(smtp_pass).trim());
      await setSystemSetting('smtp_from', String(smtp_from).trim());
    }

    // Update registration enabled if provided
    if (registration_enabled !== undefined) {
      await setSystemSetting('registration_enabled', registration_enabled ? 'true' : 'false');
    }

    // Update default API key if provided
    if (default_api_key !== undefined) {
      await setSystemSetting('default_api_key', String(default_api_key).trim());
    }

    return res.json(successResponse({ updated: true }));
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json(errorResponse('更新系统设置失败'));
  }
});

// 单独的默认API密钥更新接口（仅更新 default_api_key）
router.put('/admin/default-api-key', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { default_api_key } = req.body;

  try {
    await setSystemSetting('default_api_key', String(default_api_key || '').trim());
    return res.json(successResponse({ updated: true }));
  } catch (error) {
    console.error('Update default API key error:', error);
    return res.status(500).json(errorResponse('更新默认API密钥失败'));
  }
});

router.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (id === req.userId) {
    return res.status(400).json(errorResponse('不能删除自己的账号'));
  }

  try {
    const deleted = await deleteUserById(id);
    if (!deleted) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json(errorResponse('删除用户失败'));
  }
});

router.put('/admin/users/:id/admin', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isAdmin } = req.body;

  if (typeof isAdmin !== 'number' || (isAdmin !== 0 && isAdmin !== 1)) {
    return res.status(400).json(errorResponse('isAdmin 必须为 0 或 1'));
  }

  if (id === req.userId) {
    return res.status(400).json(errorResponse('不能修改自己的管理员状态'));
  }

  try {
    const user = await updateUserAdminStatus(id, isAdmin);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Update admin status error:', error);
    return res.status(500).json(errorResponse('更新管理员状态失败'));
  }
});

router.get('/admin/settings', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getAllSystemSettings();
    return res.json(successResponse(settings));
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json(errorResponse('获取系统设置失败'));
  }
});

// ========== Email Templates Routes ==========

router.get('/admin/email-templates', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await getAllEmailTemplates();
    return res.json(successResponse(templates));
  } catch (error) {
    console.error('Get email templates error:', error);
    return res.status(500).json(errorResponse('获取邮件模板失败'));
  }
});

router.put('/admin/email-templates', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { templates } = req.body;

  if (!templates || typeof templates !== 'object') {
    return res.status(400).json(errorResponse('无效的模板数据'));
  }

  try {
    await updateEmailTemplates(templates);
    return res.json(successResponse({ updated: true }));
  } catch (error) {
    console.error('Update email templates error:', error);
    return res.status(500).json(errorResponse('更新邮件模板失败'));
  }
});

// ========== Generation Logs Routes ==========

router.get('/admin/generation-logs', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { user_id, model, type, start_date, end_date, limit, offset } = req.query;

  try {
    const result = await getGenerationLogs({
      userId: user_id as string,
      model: model as string,
      type: type as string,
      startDate: start_date ? new Date(start_date as string) : undefined,
      endDate: end_date ? new Date(end_date as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    return res.json(successResponse(result));
  } catch (error) {
    console.error('Get generation logs error:', error);
    return res.status(500).json(errorResponse('获取生图日志失败'));
  }
});

router.put('/admin/users/:id/compute-points', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
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
      user = await addUserComputePoints(id, points);
    } else {
      user = await updateUserComputePoints(id, points);
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

router.put('/admin/users/:id/api-key', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { apiKey } = req.body;

  if (apiKey === undefined || apiKey === null) {
    return res.status(400).json(errorResponse('请提供 API Key'));
  }

  const apiKeyStr = String(apiKey).trim();
  // 空字符串允许清除API密钥，但长度不能超过500
  if (apiKeyStr.length > 500) {
    return res.status(400).json(errorResponse('API Key 长度不能超过 500 字符'));
  }

  try {
    const user = await updateUserApiKey(id, apiKeyStr);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Update API key error:', error);
    return res.status(500).json(errorResponse('更新 API Key 失败'));
  }
});

router.post('/admin/users/:id/compute-points/gift', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入赠送原因'));
  }

  try {
    const user = await adminGiftComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Gift compute points error:', error);
    return res.status(500).json(errorResponse('赠送算力值失败'));
  }
});

router.post('/admin/users/:id/compute-points/compensate', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入补偿原因'));
  }

  try {
    const user = await adminCompensateComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Compensate compute points error:', error);
    return res.status(500).json(errorResponse('补偿算力值失败'));
  }
});

router.post('/admin/users/:id/compute-points/deduct', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json(errorResponse('算力值必须为正数'));
  }

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入扣除原因'));
  }

  try {
    const result = await adminDeductComputePoints(id, points, String(reason).trim(), req.userId!);
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || '扣除算力值失败'));
    }
    return res.json(successResponse(result.user));
  } catch (error) {
    console.error('Deduct compute points error:', error);
    return res.status(500).json(errorResponse('扣除算力值失败'));
  }
});

router.post('/admin/users/:id/compute-points/clear', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { reason } = req.body;

  if (!reason || String(reason).trim().length === 0) {
    return res.status(400).json(errorResponse('请输入清空原因'));
  }

  try {
    const user = await adminClearComputePoints(id, String(reason).trim(), req.userId!);
    if (!user) {
      return res.status(404).json(errorResponse('用户不存在'));
    }
    return res.json(successResponse(user));
  } catch (error) {
    console.error('Clear compute points error:', error);
    return res.status(500).json(errorResponse('清空算力值失败'));
  }
});

// ========== Subscription Plans Routes ==========

router.get('/admin/plans', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await getAllPlansIncludingInactive();
    return res.json(successResponse(plans));
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json(errorResponse('获取套餐列表失败'));
  }
});

router.post('/admin/plans', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const { id, name, price, period, monthlyQuota, dailySignIn, qualities, concurrency, watermark, extras, isActive, sortOrder } = req.body;

  if (!id || !name || price === undefined || !period) {
    return res.status(400).json(errorResponse('请填写完整的套餐信息'));
  }

  try {
    const plan = await createSubscriptionPlan({
      id, name, price, period,
      monthlyQuota: monthlyQuota || 0,
      dailySignIn: dailySignIn || 0,
      qualities: qualities || '[]',
      concurrency: concurrency || 1,
      watermark: watermark ?? true,
      extras: extras || '[]',
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    });
    return res.status(201).json(successResponse(plan));
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json(errorResponse('创建套餐失败'));
  }
});

router.put('/admin/plans/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updates = req.body;

  try {
    const plan = await updateSubscriptionPlan(id, updates);
    if (!plan) {
      return res.status(404).json(errorResponse('套餐不存在'));
    }
    return res.json(successResponse(plan));
  } catch (error) {
    console.error('Update plan error:', error);
    return res.status(500).json(errorResponse('更新套餐失败'));
  }
});

router.delete('/admin/plans/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const deleted = await deleteSubscriptionPlan(id);
    if (!deleted) {
      return res.status(404).json(errorResponse('套餐不存在'));
    }
    return res.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error('Delete plan error:', error);
    return res.status(500).json(errorResponse('删除套餐失败'));
  }
});

router.get('/admin/users/:id/subscriptions', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const subscriptions = await getUserSubscriptions(id);
    const activeSubscription = await getUserActiveSubscription(id);
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

  const plan = await getPlanById(planId);
  if (!plan) {
    return res.status(404).json(errorResponse('套餐不存在'));
  }

  const durationMonths = months || (plan.period === '年付' ? 12 : 1);
  const daysInMonth = 30;

  try {
    const subscriptionId = `sub_${uuidv4()}`;
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + durationMonths);

    // 开通套餐时赠送算力：月度积分 + 每日积分 * 30天
    const monthlyPoints = plan.monthly_quota * durationMonths;
    const dailyPoints = plan.daily_sign_in * daysInMonth * durationMonths;
    const totalPoints = monthlyPoints + dailyPoints;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // 使用事务保证一致性：创建订阅 -> 赠送算力 -> 记录日志
    await prisma.$transaction([
      prisma.userSubscription.create({
        data: {
          id: subscriptionId,
          userId: id,
          planId: planId,
          expireDate: expireDate,
          autoRenew: false,
        },
      }),
      prisma.user.update({
        where: { id },
        data: { compute_points: { increment: totalPoints } },
      }),
      prisma.computePointLog.create({
        data: {
          id: logId,
          userId: id,
          amount: totalPoints,
          type: 'gift',
          reason: `开通套餐「${plan.name}」赠送（月度${monthlyPoints} + 每日${dailyPoints}）`,
          operatorId: req.userId!,
        },
      }),
    ]);

    const subscription = {
      id: subscriptionId,
      user_id: id,
      plan_id: planId,
      status: 'active',
      start_date: new Date().toISOString(),
      expire_date: expireDate.toISOString(),
      auto_renew: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return res.status(201).json(successResponse({ subscription, addedPoints: totalPoints, monthlyPoints, dailyPoints }));
  } catch (error) {
    console.error('Create subscription error:', error);
    return res.status(500).json(errorResponse('开通套餐失败'));
  }
});

router.put('/admin/users/:userId/subscriptions/:subscriptionId/cancel', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

  try {
    const cancelled = await cancelUserSubscription(subscriptionId);
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
    const subscriptions = await getUserSubscriptions(userId);
    const subscription = subscriptions.find(s => s.id === subscriptionId);

    if (!subscription) {
      return res.status(404).json(errorResponse('订阅不存在'));
    }

    const plan = await getPlanById(subscription.plan_id);
    if (!plan) {
      return res.status(404).json(errorResponse('套餐不存在'));
    }

    const currentExpire = new Date(subscription.expire_date);
    currentExpire.setMonth(currentExpire.getMonth() + months);

    // 续费时赠送算力：月度积分 + 每日积分 * 30天
    const daysInMonth = 30;
    const monthlyPoints = plan.monthly_quota * months;
    const dailyPoints = plan.daily_sign_in * daysInMonth * months;
    const totalPoints = monthlyPoints + dailyPoints;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // 使用事务保证一致性：更新订阅到期时间 -> 赠送算力 -> 记录日志
    const extended = await prisma.$transaction([
      prisma.userSubscription.update({
        where: { id: subscriptionId },
        data: { expireDate: currentExpire },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { compute_points: { increment: totalPoints } },
      }),
      prisma.computePointLog.create({
        data: {
          id: logId,
          userId: userId,
          amount: totalPoints,
          type: 'gift',
          reason: `续费套餐「${plan.name}」赠送（月度${monthlyPoints} + 每日${dailyPoints}）`,
          operatorId: req.userId!,
        },
      }),
    ]);

    return res.json(successResponse({ extended: { subscriptionId, expireDate: currentExpire }, addedPoints: totalPoints, monthlyPoints, dailyPoints }));
  } catch (error) {
    console.error('Extend subscription error:', error);
    return res.status(500).json(errorResponse('续费套餐失败'));
  }
});

router.delete('/admin/users/:userId/subscriptions/:subscriptionId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const subscriptionId = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;

  try {
    const deleted = await deleteUserSubscription(subscriptionId);
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
