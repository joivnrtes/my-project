const WebSocket = require('ws');
const Chat = require('./models/Chat'); // 确保正确引入 Chat 模型
const { verifyTokenAndGetUserId } = require('./utils/jwt');

const onlineUsers = new Map();

/**
 * 发送消息到用户
 */
function sendMessageToUser(userId, message) {
  const recipientSocket = onlineUsers.get(userId);
  if (recipientSocket) {
    recipientSocket.send(JSON.stringify(message));
  }
}

/**
 * 初始化 WebSocket 服务器
 */
function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    let token = url.searchParams.get('token');

    if (!token) {
      console.error('❌ WebSocket 连接失败：Token 为空');
      ws.close(4001, 'Invalid token');
      return;
    }

    // ✅ 处理 "Bearer " 前缀问题
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim(); // 去掉 "Bearer " 前缀
    }

    let userId;
    try {
      userId = verifyTokenAndGetUserId(token);
      if (!userId) {
        console.error('❌ WebSocket 连接失败：Token 无效');
        ws.close(4001, 'Invalid token');
        return;
      }
    } catch (err) {
      console.error('❌ WebSocket 解析 Token 失败:', err.message);
      ws.close(4001, 'Invalid token');
      return;
    }

    // ✅ 存储用户 WebSocket 连接
    onlineUsers.set(userId, ws);
    console.log(`✅ WebSocket: 用户 ${userId} 连接成功`);

    ws.on('message', async (messageStr) => {
      try {
        const data = JSON.parse(messageStr);
    
        if (data.type === 'chat') {
          const { to, message } = data;
          if (!to || !message) return;
    
          // ✅ 存入数据库
          const chatMessage = new Chat({ from: userId, to, message });
          await chatMessage.save();
    
          // ✅ 仅发送给目标用户（不推送给自己）
          sendMessageToUser(to, { type: 'chat', from: userId, message });
    
          console.log(`📩 [WebSocket] 用户 ${userId} 发送消息: ${message} 给用户 ${to}`);
        } else if (data.type === 'delete_chat') {
          sendMessageToUser(data.to, { type: 'delete_chat', from: userId });
        }
      } catch (err) {
        console.error('WebSocket 消息解析错误:', err);
      }
    });
    

    ws.on('close', () => {
      console.log(`🔌 用户 ${userId} 断开连接`);
      onlineUsers.delete(userId);
    });
  });
}

module.exports = { initWebSocket, sendMessageToUser };

