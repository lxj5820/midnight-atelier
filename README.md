
# Midnight Atelier

## 功能特点

- **AI 图片生成** - 支持多种视觉预设风格，可调节创意度、结构强度、画质等参数
- **画廊社区** - 展示和浏览社区创作，支持发布自己的作品
- **账户管理** - 个人资料管理、令牌管理、额度查询
- **账单管理** - 订阅计划和用量查询

## 技术栈

**前端**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- motion/react 动画

**后端**
- Express.js + TypeScript
- SQLite (better-sqlite3)
- 阿里云 OSS 图片存储

## 本地开发

**前端**

```bash
npm install
npm run dev
```

**后端**

```bash
cd server
npm install
npm run dev
```

## 环境变量

**前端** (.env)
```
VITE_API_BASE_URL=http://localhost:3001
```

**后端** (.env)
```
PORT=3001
OSS_ACCESS_KEY_ID=your_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=your_bucket
OSS_REGION=your_region
```

## 项目结构

```
src/
├── App.tsx          # 主应用组件
├── BillingView.tsx  # 账单管理页面
├── menuConfig.ts    # 菜单配置
└── visualPresetConfig.ts  # 视觉预设配置

server/
├── src/
│   ├── routes.ts    # API 路由
│   ├── middleware.ts # 认证中间件
│   ├── db.ts        # 数据库操作
│   └── oss.ts       # 阿里云 OSS
└── data/
    └── atelier.db   # SQLite 数据库
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/login | 登录 |
| POST | /api/logout | 退出登录 |
| GET | /api/gallery | 获取画廊列表 |
| POST | /api/gallery/upload | 上传作品 |
| GET | /api/user/info | 获取用户信息 |
| PUT | /api/user/profile | 更新用户资料 |
| GET | /api/tokens | 获取令牌列表 |

---

© 2026 Midnight Atelier. 致力于用 AI 赋能每一位设计师。
