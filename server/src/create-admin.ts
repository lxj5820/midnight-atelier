import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db, findUserByEmail, createUser } from './db.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  console.log('=== 创建管理员账号 ===\n');

  const email = await question('请输入管理员邮箱: ');
  if (!email || !email.includes('@')) {
    console.error('错误: 请输入有效的邮箱地址');
    rl.close();
    return;
  }

  const existing = findUserByEmail(email.trim());
  if (existing) {
    console.log('\n该邮箱已存在，正在设置为管理员...');
    const stmt = db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?');
    stmt.run(email.trim());
    console.log('✓ 已将该用户设置为管理员');
    rl.close();
    return;
  }

  const password = await question('请输入管理员密码 (至少6位): ');
  if (!password || password.length < 6) {
    console.error('错误: 密码长度至少为 6 位');
    rl.close();
    return;
  }

  const nickname = await question('请输入管理员昵称: ');
  if (!nickname || nickname.trim().length === 0) {
    console.error('错误: 请输入昵称');
    rl.close();
    return;
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    createUser(id, email.trim(), passwordHash, nickname.trim());

    const stmt = db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?');
    stmt.run(id);

    console.log('\n✓ 管理员账号创建成功！');
    console.log(`  邮箱: ${email.trim()}`);
    console.log(`  昵称: ${nickname.trim()}`);
  } catch (error) {
    console.error('创建管理员失败:', error);
  }

  rl.close();
}

createAdminUser();
