require('dotenv').config(); // 确保加载 .env 文件中的环境变量
const sendEmail = require('./sendEmail'); // 根据实际路径调整

(async () => {
  try {
    await sendEmail({
      email: 'receiver@example.com', // 替换为实际的收件人邮箱地址
      subject: '测试邮件', // 邮件主题
      message: '这是一封测试邮件，内容仅供测试使用。', // 邮件正文
    });
    console.log('邮件发送成功');
  } catch (error) {
    console.error('邮件发送失败:', error);
  }
})();
