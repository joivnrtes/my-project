const nodemailer = require('nodemailer');

/**
 * sendEmail 工具函数
 *
 * @param {Object} options 选项对象，包含：
 *   - email: 收件人邮箱地址（字符串）
 *   - subject: 邮件主题（字符串）
 *   - message: 邮件文本内容（字符串）
 *
 * 使用 nodemailer 发送邮件，需要提供 SMTP 配置信息。
 */
const sendEmail = async (options) => {
  // 创建 Nodemailer 传输器（transporter）
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',      // SMTP 服务器地址
    port: 587,                   // SMTP 端口
    secure: false,               // 使用 TLS 时设置为 false
    auth: {
      user: process.env.GMAIL_USER, // 发件邮箱地址（从环境变量中获取）
      pass: process.env.GMAIL_PASS, // 邮箱密码或授权码（从环境变量中获取）
    },
  });

  // 设置邮件选项
  const mailOptions = {
    from: `"My App" <${process.env.GMAIL_USER}>`, // 发件人信息
    to: options.email,       // 收件人邮箱地址
    subject: options.subject, // 邮件主题
    text: options.message,    // 邮件正文
  };

  // 发送邮件
  try {
    await transporter.sendMail(mailOptions);
    console.log('邮件发送成功');
  } catch (err) {
    console.error('邮件发送失败:', err);
    throw err;
  }
};

module.exports = sendEmail;

