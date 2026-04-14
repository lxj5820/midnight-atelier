# 快速启动指南

## 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

## 2. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，设置JWT密钥：

```env
PORT=3001
JWT_SECRET=your_random_secret_key_at_least_32_characters_long
CLIENT_URL=http://localhost:3000
```

## 3. 创建管理员账号

```bash
cd server
npm run create-admin
```

按提示输入：
- 管理员邮箱
- 管理员密码（至少6位）
- 管理员昵称

## 4. 启动服务

### 启动后端服务器

```bash
cd server
npm run dev
```

服务器将在 http://localhost:3001 启动

### 启动前端开发服务器

在新的终端窗口中：

```bash
npm run dev
```

前端将在 http://localhost:3000 启动

## 5. 配置SMTP邮件服务

1. 使用管理员账号登录系统
2. 点击顶部导航栏的"管理后台"
3. 切换到"SMTP设置"标签
4. 填写SMTP配置信息并保存

## 6. 测试注册功能

1. 退出登录
2. 点击"注册"标签
3. 输入邮箱地址
4. 点击"发送验证码"
5. 在邮箱中查收验证码
6. 完成注册

## 常见问题

### Q: 验证码发送失败？
A: 请确保已在管理后台正确配置SMTP设置，并且邮箱服务商已开启SMTP服务。

### Q: 如何重置管理员密码？
A: 可以再次运行 `npm run create-admin`，使用相同的邮箱会将该用户设置为管理员。

### Q: 数据库文件在哪里？
A: 数据库文件位于 `server/data/atelier.db`

## 项目结构

```
.
├── src/                    # 前端源代码
│   ├── App.tsx            # 主应用组件
│   ├── AuthContext.tsx    # 认证上下文
│   ├── AdminPanel.tsx     # 管理员后台
│   ├── adminApi.ts        # 管理员API
│   └── api.ts             # API工具函数
├── server/                # 后端源代码
│   ├── src/
│   │   ├── index.ts       # 服务器入口
│   │   ├── db.ts          # 数据库操作
│   │   ├── routes.ts      # API路由
│   │   ├── middleware.ts  # 中间件
│   │   ├── email.ts       # 邮件服务
│   │   └── create-admin.ts # 创建管理员脚本
│   └── data/              # 数据库文件目录
└── REGISTRATION_GUIDE.md  # 详细使用指南
```

## 技术栈

- **前端**: React 19 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT + Cookie
- **邮件**: nodemailer
