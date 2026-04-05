import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findUserByApiKey,
  createUser,
  updateUser,
  setUserAdmin,
  saveApiKeyValidation,
  getApiKeyValidation,
  createGalleryItem,
  getGalleryItems,
  getPendingGalleryItems,
  getGalleryItemsByUser,
  updateGalleryItem,
  deleteGalleryItem,
  getGalleryItemById,
  User
} from './db.js';
import { uploadBase64ToOSS, checkOSSImageExists } from './oss.js';

import { authMiddleware, AuthRequest } from './middleware.js';
import { adminMiddleware } from './adminMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，仅支持 JPG, PNG, WEBP'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

const router = Router();

interface ApiResponse<T = any> {
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

/**
 * 从请求中获取 API Key（支持多种来源）
 * 优先级：Authorization Header > Body > Query
 */
function getApiKeyFromRequest(req: Request): string | null {
  // 1. 优先从 Authorization Header 获取 (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) return token;
  }
  
  // 2. 从请求体获取
  if (req.body && req.body.apiKey) {
    return req.body.apiKey;
  }
  
  // 3. 从查询参数获取
  if (req.query && req.query.apiKey) {
    return req.query.apiKey as string;
  }
  
  return null;
}

// ========== 公开端点（不需要认证）==========

router.post('/validate-api-key', async (req: Request, res: Response) => {
  const apiKey = getApiKeyFromRequest(req) || req.body.apiKey;

  if (!apiKey) {
    return res.status(400).json(errorResponse('API key is required'));
  }

  try {
    const cachedValidation = getApiKeyValidation(apiKey);
    if (cachedValidation !== null) {
      return res.json(successResponse({ isValid: cachedValidation }));
    }

    // 统一使用 /v1/chat/completions 发送极简测试请求以节省额度
    const response = await fetch('https://newapi.asia/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      })
    });

    const isValid = response.status === 200;
    saveApiKeyValidation(apiKey, isValid);

    res.json(successResponse({ isValid }));
  } catch (error) {
    saveApiKeyValidation(apiKey, false);
    res.json(successResponse({ isValid: false }));
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const apiKey = getApiKeyFromRequest(req) || req.body.apiKey;
  const { nickname, avatar } = req.body;

  if (!apiKey) {
    return res.status(400).json(errorResponse('API key is required'));
  }

  if (!nickname) {
    return res.status(400).json(errorResponse('Nickname is required'));
  }

  try {
    const existingUser = findUserByApiKey(apiKey);
    if (existingUser) {
      return res.status(409).json(errorResponse('User already exists with this API key'));
    }

    const id = uuidv4();
    const user = createUser(id, apiKey, nickname, avatar || '');

    res.status(201).json(successResponse(user));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(errorResponse('Failed to register user'));
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { userId, authToken } = req.body;

  if (!userId || !authToken) {
    return res.status(400).json(errorResponse('账户 ID 和授权令牌为必填项'));
  }

  try {
    // 调用外部 API 获取账号信息（通过后端代理避免跨域）
    let externalUserInfo: any = null;
    try {
      const response = await fetch('https://yunwu.ai/api/user/self', {
        method: 'GET',
        headers: {
          'new-api-user': userId,
          'Authorization': authToken
        }
      });
      if (response.ok) {
        externalUserInfo = await response.json();
        console.log('账号信息:', JSON.stringify(externalUserInfo, null, 2));
      }
    } catch (e) {
      console.error('Failed to fetch external user info:', e);
    }

    // 使用 userId 作为本地用户的标识
    let user = findUserByApiKey(userId);

    if (!user) {
      // 新用户：使用外部 API 返回的用户名或默认昵称
      const username = externalUserInfo?.data?.username || externalUserInfo?.username || 'NightShade_Artist';
      const avatar = externalUserInfo?.data?.avatar || externalUserInfo?.avatar || '';
      const quota = externalUserInfo?.data?.quota || externalUserInfo?.quota || 0;
      const id = uuidv4();
      user = createUser(id, userId, username, avatar);
    } else if (externalUserInfo) {
      // 老用户：如果外部 API 返回了新信息，更新本地记录
      const username = externalUserInfo?.data?.username || externalUserInfo?.username;
      const avatar = externalUserInfo?.data?.avatar || externalUserInfo?.avatar;
      if (username && username !== user.nickname) {
        updateUser(userId, { nickname: username });
      }
      if (avatar !== undefined) {
        updateUser(userId, { avatar });
      }
      user = findUserByApiKey(userId)!;
    }

    const quota = externalUserInfo?.data?.quota || externalUserInfo?.quota || 0;

    res.json(successResponse({
      ...user,
      userId,
      authToken,
      quota
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(errorResponse('登录失败'));
  }
});

// 获取令牌列表（代理外部 API）
router.get('/tokens', async (req: Request, res: Response) => {
  const userId = req.headers['new-api-user'] as string;
  const authToken = req.headers['authorization'] as string;

  if (!userId || !authToken) {
    return res.status(400).json(errorResponse('缺少认证信息'));
  }

  const p = req.query.p as string || '0';
  const size = req.query.size as string || '10';

  try {
    const response = await fetch(`https://yunwu.ai/api/token/?p=${p}&size=${size}`, {
      method: 'GET',
      headers: {
        'new-api-user': userId,
        'Authorization': authToken
      }
    });

    const data = await response.json();
    // 直接透传外部 API 响应，不做额外包装
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch token list:', error);
    res.status(500).json(errorResponse('获取令牌列表失败'));
  }
});

// 获取画廊列表（公开）
router.get('/gallery', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const items = getGalleryItems(limit, offset);

  // 检查并清理不存在的OSS图片
  const validItems: typeof items = [];
  for (const item of items) {
    try {
      const exists = await checkOSSImageExists(item.imageUrl);
      if (exists) {
        validItems.push(item);
      } else {
        deleteGalleryItem(item.id);
        console.log(`Cleaned up invalid gallery item: ${item.id}`);
      }
    } catch {
      // 检查失败时保留图片
      validItems.push(item);
    }
  }

  res.json(successResponse(validItems));
});

// 清理不存在的OSS图片（管理员）
router.post('/gallery/cleanup', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const allItems = getGalleryItems(1, 0); // 获取足够多的数据
    // 实际上我们需要获取所有，这里简化处理
    const items = getGalleryItems(1000, 0);
    let deletedCount = 0;

    for (const item of items) {
      const exists = await checkOSSImageExists(item.imageUrl);
      if (!exists) {
        deleteGalleryItem(item.id);
        deletedCount++;
        console.log(`Deleted invalid gallery item: ${item.id}`);
      }
    }

    res.json(successResponse({ deleted: deletedCount }));
  } catch (error) {
    console.error('Gallery cleanup error:', error);
    res.status(500).json(errorResponse('清理失败'));
  }
});

// 获取当前用户自己的作品（需要认证）
router.get('/gallery/user/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const items = getGalleryItemsByUser(user.id);
  res.json(successResponse(items));
});

// ========== 需要认证的端点 ==========

// 获取当前用户信息
router.get('/user/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json(successResponse(user));
});

// 获取用户信息（含额度，从外部API刷新）
router.get('/user/info', async (req: Request, res: Response) => {
  const userId = req.headers['new-api-user'] as string;
  const authToken = req.headers['authorization'] as string;

  if (!userId || !authToken) {
    return res.status(400).json(errorResponse('缺少认证信息'));
  }

  const user = findUserByApiKey(userId);
  if (!user) {
    return res.status(401).json(errorResponse('用户不存在'));
  }

  try {
    // 调用外部 API 获取最新额度信息
    const response = await fetch('https://yunwu.ai/api/user/self', {
      method: 'GET',
      headers: {
        'new-api-user': userId,
        'Authorization': authToken
      }
    });

    if (response.ok) {
      const externalUserInfo = await response.json();
      const quota = externalUserInfo?.data?.quota || externalUserInfo?.quota || 0;

      res.json(successResponse({
        ...user,
        quota
      }));
    } else {
      res.json(successResponse({
        ...user,
        quota: 0
      }));
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    res.json(successResponse({
      ...user,
      quota: 0
    }));
  }
});

// 更新用户信息
router.put('/user/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { nickname, avatar } = req.body;
  const apiKey = req.apiKey!;

  const updates: { nickname?: string; avatar?: string } = {};
  if (nickname !== undefined) updates.nickname = nickname;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = updateUser(apiKey, updates);
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  res.json(successResponse(user));
});

// 上传作品
router.post('/gallery/upload', async (req: Request, res: Response) => {
  const apiKey = getApiKeyFromRequest(req);
  const { description, imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json(errorResponse('请提供图片数据'));
  }

  // 尝试从 API key 获取用户信息，如果失败则使用匿名用户
  let userId = 'anonymous';
  let author = '匿名用户';
  let authorAvatar = '';

  if (apiKey) {
    const user = findUserByApiKey(apiKey);
    if (user) {
      userId = user.id;
      author = user.nickname;
      authorAvatar = user.avatar;
    }
  }

  try {
    // 生成文件名：用户名-时间戳
    const filename = `${author}-${Date.now()}`;
    // 上传到阿里云 OSS
    const imageUrl = await uploadBase64ToOSS(imageBase64, filename);

    const id = uuidv4();
    const item = createGalleryItem(id, userId, author, imageUrl, authorAvatar, description || '');
    res.status(201).json(successResponse(item));
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json(errorResponse('上传失败'));
  }
});

// 更新作品信息
router.put('/gallery/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const apiKey = getApiKeyFromRequest(req);
  const { description, type } = req.body;

  if (!apiKey) {
    return res.status(401).json(errorResponse('API key is required'));
  }

  const user = findUserByApiKey(apiKey);
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  const item = getGalleryItemById(id);
  if (!item) {
    return res.status(404).json(errorResponse('Gallery item not found'));
  }

  if (item.user_id !== user.id) {
    return res.status(403).json(errorResponse('Not authorized'));
  }

  const updates: { description?: string; type?: string } = {};
  if (description !== undefined) updates.description = description;
  if (type !== undefined) updates.type = type;

  const updated = updateGalleryItem(id, updates);
  res.json(successResponse(updated));
});

// 删除作品
router.delete('/gallery/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(401).json(errorResponse('API key is required'));
  }

  const user = findUserByApiKey(apiKey);
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  const item = getGalleryItemById(id);
  if (!item) {
    return res.status(404).json(errorResponse('Gallery item not found'));
  }

  if (item.user_id !== user.id) {
    return res.status(403).json(errorResponse('Not authorized'));
  }

  deleteGalleryItem(id);
  res.json(successResponse({ deleted: true }));
});

// ========== 管理员端点 ==========

// 获取待审核作品列表
router.get('/gallery/pending', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const items = getPendingGalleryItems(limit, offset);
  res.json(successResponse(items));
});

// 批准作品
router.put('/gallery/:id/approve', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const item = getGalleryItemById(id);
  if (!item) {
    return res.status(404).json(errorResponse('Gallery item not found'));
  }
  const updated = updateGalleryItem(id, { type: 'published' });
  res.json(successResponse(updated));
});

// 拒绝作品（删除）
router.put('/gallery/:id/reject', authMiddleware, adminMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const item = getGalleryItemById(id);
  if (!item) {
    return res.status(404).json(errorResponse('Gallery item not found'));
  }
  deleteGalleryItem(id);
  res.json(successResponse({ deleted: true }));
});

// 管理员设置管理员权限（通过密码验证）
router.post('/admin/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(400).json(errorResponse('API key is required'));
  }

  // 验证管理员密码
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return res.status(500).json(errorResponse('Server configuration error'));
  }

  if (password !== adminPassword) {
    return res.status(401).json(errorResponse('Invalid password'));
  }

  // 查找用户
  const user = findUserByApiKey(apiKey);
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  // 设置为管理员
  setUserAdmin(apiKey, true);
  res.json(successResponse({ isAdmin: true }));
});

// 检查当前用户是否为管理员
router.get('/admin/check', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json(successResponse({ isAdmin: !!user.is_admin }));
});

export default router;
