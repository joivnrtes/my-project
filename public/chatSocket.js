import { io } from "socket.io-client";

let socket = null;
let reconnectTimer = null;

function getCurrentUserId() {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  return userInfo ? (userInfo._id || userInfo.id).toString() : null;
}

function connectWS() {
  let token = localStorage.getItem("accessToken");
  if (!token) {
    alert("请先登录！");
    window.location.href = "login.html";
    return;
  }

  // ✅ 确保 Bearer 认证
  token = `Bearer ${token}`;

  // 断开已有连接
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // ✅ 改为 Render 服务器地址
  const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "wss://websocket-server-o0o0.onrender.com";

  socket = io(SERVER_URL, {
    transports: ["websocket"],
    query: { token },
  });

  socket.on("connect", () => {
    console.log("[WS] 连接成功:", socket.id);
  });

  socket.on("message", (data) => {
    console.log("[WS] 收到消息:", data);
    const userId = getCurrentUserId();
    if (data.from !== userId && data.from === currentChatUser) {
      const chatMessagesEl = document.getElementById("chat-messages");

      // ✅ 过滤重复消息（防止 WebSocket 重连导致的重复消息）
      const existingMessages = Array.from(chatMessagesEl.children).map((msg) =>
        msg.textContent.trim()
      );
      if (!existingMessages.includes(data.message.trim())) {
        const msgBubble = createBubble(data.message, "friend");
        chatMessagesEl.appendChild(msgBubble);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }
    }
  });

  socket.on("disconnect", () => {
    console.warn("[WS] 连接断开");
    socket = null;
    reconnectTimer = setTimeout(connectWS, 5000);
  });

  socket.on("connect_error", (err) => {
    console.error("[WS] WebSocket 连接错误:", err);
  });
}

function sendWSMessage(msgObj) {
  if (socket && socket.connected) {
    socket.emit("message", msgObj);
  } else {
    console.log("[WS] 当前未连接，无法发送消息");
  }
}

window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;
