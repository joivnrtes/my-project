let ws = null;
let reconnectTimer = null;

function getCurrentUserId() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  return (userInfo._id || userInfo.id).toString();
}

function connectWS() {
  let token = localStorage.getItem('accessToken');
  if (!token) {
    alert('请先登录！');
    window.location.href = 'login.html';
    return;
  }

  // ✅ 保持 "Bearer " 前缀，以保证和 fetchWithAuth() 一致
  token = `Bearer ${token}`;

    // 如果已有 ws 连接，先关闭
    if (ws) {
      ws.onmessage = null; // ✅ 清除旧的 onmessage 监听器
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }

  ws = new WebSocket(`ws://localhost:3000?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    console.log('[WS] 连接成功');
  };

  ws.onmessage = (event) => {
    console.log('[WS] 收到消息:', event.data);
    const data = JSON.parse(event.data);
    const userId = getCurrentUserId();
    if (data.type === 'chat' && data.from !== userId && data.from === currentChatUser) {
      // 显示聊天消息
      const chatMessagesEl = document.getElementById('chat-messages');
// ✅ 过滤重复消息（防止 WebSocket 重连导致的重复消息）
const existingMessages = Array.from(chatMessagesEl.children).map(msg => msg.textContent.trim());
if (!existingMessages.includes(data.message.trim())) {
  const msgBubble = createBubble(data.message, 'friend');
  chatMessagesEl.appendChild(msgBubble);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}
}
};

  ws.onclose = (event) => {
    console.warn(`[WS] 连接关闭 (代码: ${event.code}, 原因: ${event.reason})`);
    ws = null;
    reconnectTimer = setTimeout(connectWS, 5000);
  };

  ws.onerror = (err) => {
    console.error('[WS] WebSocket 错误:', err);
  };
}

function sendWSMessage(msgObj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msgObj));
  } else {
    console.log('[WS] 当前未连接，无法发送消息');
  }
}

window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;
