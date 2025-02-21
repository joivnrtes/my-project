let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let messageQueue = [];
const MAX_RECONNECT_ATTEMPTS = 10;
let lastSentMessageId = null;

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

    if (socket && socket.connecting) {
        console.log("[WS] WebSocket 正在连接中...");
        return;
    }

    let token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("[WS] 没有找到 accessToken，无法连接 WebSocket");
        alert("请先登录！");
        window.location.href = "login.html";
        return;
    }

    const SERVER_URL = "wss://websocket-server-o0o0.onrender.com";

    socket = io(SERVER_URL, {
        transports: ["websocket"],
        query: { token },
        reconnection: false,
    });

    socket.on("connect", () => {
        console.log("[WS] 连接成功:", socket.id);
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        reconnectAttempts = 0;

        // ✅ 重新发送队列中的消息，防止消息丢失
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

        reconnectAttempts++;
        reconnectTimer = setTimeout(() => {
            console.log("[WS] 正在尝试重新连接 WebSocket...");
            socket = null;
            connectWS();
        }, Math.min(5000 * (2 ** reconnectAttempts), 60000));
    });

    socket.on("connect_error", (err) => {
        console.error(`[WS] 连接错误 (${err.message})`);

        if (err.message.includes("invalid token")) {
            console.error("[WS] 无效的 token，停止重试！");
            return;
        }

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("[WS] 已达最大重连次数，放弃重连。");
            return;
        }

        reconnectAttempts++;
        reconnectTimer = setTimeout(connectWS, Math.min(5000 * (2 ** reconnectAttempts), 60000));
    });
}

// ✅ WebSocket 发送消息的函数
function sendWSMessage(data) {
    if (!socket || !socket.connected) {
        console.warn("[WS] WebSocket 未连接，消息暂存到队列中...");
        
        // ✅ 避免存入重复消息
        if (!messageQueue.find(msg => msg.id === data.id)) {
            messageQueue.push(data);
        }

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

// ✅ 监听页面刷新，防止 WebSocket 连接泄漏
window.addEventListener("beforeunload", () => {
    if (socket) {
        console.log("[WS] 页面刷新，关闭 WebSocket 连接...");
        socket.disconnect();
    }
});

async function markMessagesAsRead(friendId) {
    try {
        console.log(`🔵 标记 ${friendId} 的消息为已读`);
        
        const response = await fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/chat/read-messages/${friendId}`, { 
            method: "POST" 
        });

        if (!response.success) {
            console.warn("⚠️ 服务器未能标记消息为已读:", response.message);
        } else {
            console.log("✅ 消息已成功标记为已读");
        }
    } catch (err) {
        console.error("❌ 标记消息为已读失败:", err);
    }
}

// ✅ 让 `markMessagesAsRead` 变成全局可用的函数
window.markMessagesAsRead = markMessagesAsRead;

// ✅ 让 `sendWSMessage` 和 `connectWS` 可在全局调用
window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;

// ✅ 页面加载时自动连接 WebSocket
window.onload = connectWS;
