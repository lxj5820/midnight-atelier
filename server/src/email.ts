import nodemailer from 'nodemailer';
import dns from 'dns';
import { getSystemSetting, getEmailTemplate } from './db.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const host = await getSystemSetting('smtp_host');
    const port = await getSystemSetting('smtp_port');
    const secure = await getSystemSetting('smtp_secure');
    const user = await getSystemSetting('smtp_user');
    const pass = await getSystemSetting('smtp_pass');
    const from = await getSystemSetting('smtp_from');

    if (!host || !port || !user || !pass || !from) {
      return null;
    }

    return {
      host,
      port: parseInt(port, 10),
      secure: secure === 'true',
      user,
      pass,
      from,
    };
  } catch (error) {
    console.error('Failed to get SMTP config:', error);
    return null;
  }
}

// 解析域名的 IPv4 地址
function resolveIPv4(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.resolve4(host, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // 如果无法解析 IPv4，返回原主机名（让 nodemailer 自己处理）
        resolve(host);
      } else {
        resolve(addresses[0]);
      }
    });
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.error('SMTP not configured');
    return false;
  }

  try {
    // 获取 SMTP 主机的 IPv4 地址，避免 IPv6 连接问题
    const smtpHost = await resolveIPv4(config.host);

    const transporter = nodemailer.createTransport({
      // 使用解析到的 IPv4 地址或原主机名
      host: smtpHost,
      port: config.port,
      secure: config.secure,
      requireTLS: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    } as nodemailer.TransportOptions);

    // 如果解析到了 IPv4 地址，设置连接时使用 IPv4
    if (smtpHost !== config.host) {
      (transporter as any).pool.on('connection', (socket: any) => {
        socket.setFamily(4);
      });
    }

    // 获取邮件模板，默认使用硬编码模板
    let template = await getEmailTemplate('verification_code');
    if (!template) {
      template = '您的验证码是：${code}\n验证码有效期为 10 分钟，请尽快使用。';
    }
    // 替换占位符
    const emailContent = template.replace(/\$\{code\}/g, code);

    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Midnight Atelier - 邮箱验证码',
      text: emailContent,
    });

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
