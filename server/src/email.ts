import nodemailer from 'nodemailer';
import dns from 'dns';
import crypto from 'crypto';
import { getAllSystemSettings, getEmailTemplate } from './db.js';

// Railway 环境不支持 IPv6 出站，全局强制 DNS 解析优先返回 IPv4
dns.setDefaultResultOrder('ipv4first');

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
    const allSettings = await getAllSystemSettings();
    const host = allSettings['smtp_host'];
    const port = allSettings['smtp_port'];
    const secure = allSettings['smtp_secure'];
    const user = allSettings['smtp_user'];
    const pass = allSettings['smtp_pass'];
    const from = allSettings['smtp_from'];

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

// 使用 IPv4 地址连接
async function sendEmailIPv4(email: string, code: string, config: SmtpConfig): Promise<boolean> {
  const template = await getEmailTemplate('verification_code') || '您的验证码是：${code}\n验证码有效期为 10 分钟，请尽快使用。';
  const emailContent = template.replace(/\$\{code\}/g, code);

  console.log(`Connecting to ${config.host}:${config.port}, sending email...`);

  return new Promise((resolve) => {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    } as nodemailer.TransportOptions);

    transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Midnight Atelier - 邮箱验证码',
      text: emailContent,
    }, (err, info) => {
      if (err) {
        console.error('SMTP send error:', err.message);
        resolve(false);
      } else {
        console.log('Email sent:', info?.response);
        resolve(true);
      }
    });
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.error('SMTP not configured - config is null');
    return false;
  }

  try {
    return await sendEmailIPv4(email, code, config);
  } catch (error: any) {
    console.error('Failed to send email:', error?.message || error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
