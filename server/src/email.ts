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
      console.error('SMTP config missing values:', { host: !!host, port: !!port, user: !!user, pass: !!pass, from: !!from });
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

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.error('SMTP not configured - config is null');
    return false;
  }

  try {
    // 直接使用配置创建 transporter，让 nodemailer 处理连接
    // Railway 环境需要明确使用 IPv4
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      // 强制使用 IPv4
      family: 4,
    } as nodemailer.TransportOptions);

    // 获取邮件模板，默认使用硬编码模板
    let template = await getEmailTemplate('verification_code');
    if (!template) {
      template = '您的验证码是：${code}\n验证码有效期为 10 分钟，请尽快使用。';
    }
    // 替换占位符
    const emailContent = template.replace(/\$\{code\}/g, code);

    console.log(`Sending email to ${email} via ${config.host}:${config.port}`);
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Midnight Atelier - 邮箱验证码',
      text: emailContent,
    });

    console.log('Email sent successfully');
    return true;
  } catch (error: any) {
    console.error('Failed to send email:', error?.message || error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
