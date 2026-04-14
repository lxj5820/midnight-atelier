# 注册功能和管理员后台使用指南

## 功能概述

本项目已实现以下功能：
1. 邮箱验证码注册
2. 管理员后台（用户管理、SMTP配置）
3. 初始管理员账号创建

## 快速开始

### 1. 配置环境变量

在 `server` 目录下创建 `.env` 文件（参考 `.env.example`）：

```env
PORT=3001
JWT_SECRET=your_random_secret_key_at_least_32_characters
CLIENT_URL=http://localhost:3000
```

### 2. 启动服务器

```bash
cd server
npm install
npm run dev
```

### 3. 创建管理员账号

在服务器启动后，运行以下命令创建管理员账号：

```bash
cd server
npm run create-admin
```

按照提示输入：
- 管理员邮箱
- 管理员密码（至少6位）
- 管理员昵称

### 4. 配置SMTP邮件服务

1. 使用管理员账号登录系统
2. 点击顶部导航栏的"管理后台"
3. 切换到"SMTP设置"标签
4. 填写SMTP配置信息：
   - SMTP服务器：如 `smtp.gmail.com`
   - 端口：通常为 `587`（TLS）或 `465`（SSL）
   - 使用SSL/TLS：根据邮箱服务商要求选择
   - SMTP用户名：发件邮箱地址
   - SMTP密码：邮箱密码或授权码
   - 发件人邮箱：显示的发件人地址
5. 点击"保存配置"

### 5. 常见邮箱服务商配置示例

#### Gmail
- SMTP服务器：`smtp.gmail.com`
- 端口：`587`
- SSL/TLS：否
- 需要开启"允许不够安全的应用访问"或使用应用专用密码

#### QQ邮箱
- SMTP服务器：`smtp.qq.com`
- 端口：`587`
- SSL/TLS：否
- 需要在QQ邮箱设置中开启SMTP服务并获取授权码

#### 163邮箱
- SMTP服务器：`smtp.163.com`
- 端口：`465`
- SSL/TLS：是
- 需要在邮箱设置中开启SMTP服务并获取授权码

## 用户注册流程

1. 用户访问注册页面
2. 输入邮箱地址
3. 点击"发送验证码"按钮
4. 在邮箱中查收验证码（有效期10分钟）
5. 输入验证码、昵称和密码
6. 完成注册

## 管理员功能

### 用户管理
- 查看所有注册用户
- 删除用户（不能删除自己）
- 设置/取消管理员权限（不能修改自己的权限）

### SMTP设置
- 配置邮件发送服务
- 测试邮件发送功能

## API接口说明

### 发送验证码
```
POST /api/auth/send-verification-code
Body: { "email": "user@example.com" }
```

### 注册
```
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "password123",
  "nickname": "用户昵称",
  "verificationCode": "123456"
}
```

### 管理员接口（需要管理员权限）
```
GET /api/admin/users - 获取用户列表
DELETE /api/admin/users/:id - 删除用户
PUT /api/admin/users/:id/admin - 设置管理员状态
GET /api/admin/settings - 获取系统设置
PUT /api/admin/settings - 更新系统设置
```

## 注意事项

1. 首次使用前必须配置SMTP，否则无法发送验证码
2. 验证码有效期为10分钟
3. 管理员不能删除或修改自己的管理员状态
4. 建议使用强密码保护管理员账号
5. SMTP密码会加密存储在数据库中

## 故障排查

### 验证码发送失败
1. 检查SMTP配置是否正确
2. 确认邮箱服务商是否开启了SMTP服务
3. 检查是否使用了正确的授权码（而非邮箱登录密码）
4. 查看服务器日志获取详细错误信息

### 无法访问管理后台
1. 确认当前账号是否为管理员
2. 检查数据库中用户的 `is_admin` 字段是否为 1
3. 尝试重新登录

## 技术栈

- 后端：Node.js + Express + TypeScript
- 数据库：SQLite (better-sqlite3)
- 邮件：nodemailer
- 认证：JWT + Cookie
- 前端：React + TypeScript
