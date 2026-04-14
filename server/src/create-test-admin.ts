import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

async function createTestAdmin() {
  const email = 'admin@test.com';
  const password = 'admin123';
  const nickname = '测试管理员';

  // 检查是否已存在
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log('用户已存在，更新为管理员...');
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email);
    console.log('✓ 已将该用户设置为管理员');
    console.log(`  邮箱: ${email}`);
    console.log(`  密码: ${password}`);
    return;
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, nickname, is_admin) VALUES (?, ?, ?, ?, 1)'
  ).run(id, email, passwordHash, nickname);

  console.log('✓ 测试管理员账号创建成功！');
  console.log(`  邮箱: ${email}`);
  console.log(`  密码: ${password}`);
  console.log(`  昵称: ${nickname}`);
}

createTestAdmin().catch(console.error);
