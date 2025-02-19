let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0; 
let messageQueue = []; 
const MAX_RECONNECT_ATTEMPTS = 10; 

function getCurrentUserId() {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  return userInfo ? (userInfo._id || userInfo.id).toString() : null;
}

function connectWS() {
  console.log("[WS] 正在尝试建立 WebSocket 连接...");

  if (socket && socket.connected) {
    console.log("[WS] WebSocket 已连接，无需重新连接");
    return;
  }

  let token = localStorage.getItem("accessToken");
  console.log("🔑 当前 token:", token);

  if (!token) {
    console.error("[WS] 没有找到 accessToken，无法连接 WebSocket");
    alert("请先登录！");
    window.location.href = "login.html";
    return;
  }

  token = `Bearer ${token}`;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const SERVER_URL = "wss://websocket-server-o0o0.onrender.com";

  socket = io(SERVER_URL, {
    transports: ["websocket"],
    auth: { token }, // 改用 auth 方式
    reconnection: false, 
  });

  socket.on("connect", () => {
    console.log("[WS] 连接成功:", socket.id);
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    reconnectAttempts = 0;

    while (messageQueue.length > 0) {
      sendWSMessage(messageQueue.shift());
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[WS] 连接断开 (${reason})，第 ${reconnectAttempts + 1} 次尝试重连...`);

    if (reason === "io server disconnect") {
      console.error("[WS] 服务器主动断开，检查 token 是否正确！");
      return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[WS] 已达最大重连次数，放弃重连。");
      return;
    }

    const delay = Math.min(5000 * (2 ** reconnectAttempts), 60000);
    reconnectAttempts++;

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWS();
      }, delay);
    }
  });

  socket.on("connect_error", (err) => {
    console.error(`[WS] 连接错误 (${err.message})，将在 5 秒后重试...`);

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[WS] 已达最大重连次数，放弃重连。");
      return;
    }

    const delay = Math.min(5000 * (2 ** reconnectAttempts), 60000);
    reconnectAttempts++;

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWS();
      }, delay);
    }
  });
}

function sendWSMessage(data) {
  if (!socket || !socket.connected) {
    console.warn("[WS] WebSocket 未连接，消息暂存到队列中...");
    messageQueue.push(data);
    connectWS();
    return;
  }

  socket.emit("message", data, (ack) => {
    if (ack && ack.success) {
      console.log("✅ 消息成功发送:", data);
    } else {
      console.error("❌ 消息发送失败:", ack);
    }
  });

  console.log("📩 发送 WebSocket 消息:", data);
}

window.onload = function () {
  console.log("[WS] 页面加载完成，尝试连接 WebSocket...");
  connectWS();
};

window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;