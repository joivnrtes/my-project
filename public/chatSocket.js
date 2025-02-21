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

        // ✅ 确保 `newMessage` 监听只执行一次
        listenForMessages();
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

// ✅ 监听 WebSocket 新消息
function listenForMessages() {
    if (!socket) {
        console.error("❌ WebSocket 未初始化，无法监听消息");
        return;
    }

    if (socket.hasListeners("newMessage")) {
        console.log("⚠️ 已经监听 newMessage，跳过重复监听");
        return;
    }

    socket.on("newMessage", (message) => {
        console.log("📩 收到新消息:", message);

        if (!message || !message.from) {
            console.warn("⚠️ 收到的消息无效:", message);
            return;
        }

        const senderId = message.from.toString().trim();

        const chatBtn = document.querySelector(`button[data-friend-id='${senderId}']`);
        if (chatBtn) {
            const unreadBadge = chatBtn.querySelector(".unread-badge");
            if (unreadBadge) {
                console.log("🔴 显示小红点");
                unreadBadge.style.display = "block";
            }
        } else {
            console.warn(`⚠️ 未找到按钮: button[data-friend-id='${senderId}']`);
        }

        updateUnreadCount();
    });
}

// ✅ WebSocket 发送消息的函数
function sendWSMessage(data) {
    if (!socket || !socket.connected) {
        console.warn("[WS] WebSocket 未连接，消息暂存到队列中...");
        
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
        console.log(`🔵 正在标记 ${friendId} 的消息为已读`);

        if (!friendId) {
            console.error("❌ 无效的 friendId，无法标记消息为已读");
            return;
        }

        const res = await fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/chat/read-messages/${friendId}`, { 
            method: "POST" 
        });

        if (!res) {
            console.error("❌ fetchWithAuth() 返回 null，API 请求失败");
            return;
        }

        if (!res.ok) {
            console.error(`❌ 标记消息失败: HTTP ${res.status} - ${res.statusText}`);
            const errorText = await res.text();
            console.error("📌 服务器返回错误:", errorText);
            return;
        }

        const response = await res.json(); // ✅ 这里手动解析 JSON
        if (response.success) {
            console.log("✅ 消息已成功标记为已读");

            // ✅ 立即隐藏小红点
            const chatBtn = document.querySelector(`button[data-friend-id='${friendId}']`);
            if (chatBtn) {
                const unreadBadge = chatBtn.querySelector(".unread-badge");
                if (unreadBadge) {
                    unreadBadge.style.display = "none";
                }
            }

            updateUnreadCount();
        } else {
            console.warn("⚠️ 服务器返回 success 为 false:", response.message);
        }
    } catch (err) {
        console.error("❌ 标记消息为已读失败:", err);
    }
}

async function updateUnreadCount() {
    try {
        const res = await fetchWithAuth("https://websocket-server-o0o0.onrender.com/api/chat/unread-count");

        if (!res || !res.ok) {
            console.error("❌ 获取未读消息失败: HTTP", res ? res.status : "无效响应");
            return;
        }

        const response = await res.json();
        if (!response.success || !response.unreadCounts) {
            console.error("⚠️ 服务器返回未读消息错误:", response);
            return;
        }

        console.log("🔄 更新未读消息数量:", response.unreadCounts);
        document.querySelectorAll(".chat-btn").forEach(btn => {
            const friendId = btn.dataset.friendId.trim();
            const unreadBadge = btn.querySelector(".unread-badge");

            if (response.unreadCounts[friendId] && response.unreadCounts[friendId] > 0) {
                console.log(`🔴 显示未读消息（${response.unreadCounts[friendId]}）: `, friendId);
                unreadBadge.style.display = "block";
            } else {
                unreadBadge.style.display = "none";
            }
        });
    } catch (err) {
        console.error("❌ 获取未读消息数量失败:", err);
    }
}

// ✅ 让 `markMessagesAsRead` 变成全局可用的函数
window.markMessagesAsRead = markMessagesAsRead;
window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;

// ✅ 页面加载时自动连接 WebSocket
window.onload = connectWS;
