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

    socket.off("newMessage"); // ✅ 先移除已有监听器，防止重复绑定
    socket.on("newMessage", (message) => {
        console.log("📩 收到新消息:", message);
    
        if (!message || !message.from) {
            console.warn("⚠️ 收到的消息无效:", message);
            return;
        }
    
        const senderId = message.from.toString().trim();
    
        // ✅ 立即更新小红点
        console.log("🔍 查找按钮:", `button[data-friend-id='${senderId}']`);
        const chatBtn = document.querySelector(`button[data-friend-id='${senderId}']`);
        if (chatBtn) {
            const unreadBadge = chatBtn.querySelector(".unread-badge");
            if (unreadBadge) {
                console.log("🔴 直接显示小红点");
                unreadBadge.style.display = "block"; // ✅ 立刻显示小红点
            }
        } else {
            console.warn(`⚠️ 未找到按钮: button[data-friend-id='${senderId}']`);
        }
    
        // ✅ 仍然调用 `updateUnreadCount()`，确保数据同步
        updateUnreadCount();
    });
}    

// ✅ WebSocket 发送消息的函数
async function sendWSMessage(to, message) {
    try {
        const response = await fetchWithAuth("https://websocket-server-o0o0.onrender.com/api/chat/send", { 
            method: "POST",
            body: JSON.stringify({ to, message })
        });

        if (!response || !response.success) {
            console.error("❌ 发送消息失败:", response ? response.message : "未知错误");
            return;
        }

        console.log("✅ 消息发送成功:", response);
    } catch (err) {
        console.error("❌ 发送消息失败:", err);
    }
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

        const response = await fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/chat/read-messages/${friendId}`, { 
            method: "POST" 
        });

        if (!response) {
            console.error("❌ API 返回 `undefined`，可能请求失败");
            return;
        }

        if (!response.success) {
            console.warn("⚠️ 服务器未能标记消息为已读:", response.message || "未知错误");
        } else {
            console.log("✅ 消息已成功标记为已读");

            // ✅ 立即隐藏小红点
            const chatBtn = document.querySelector(`button[data-friend-id='${friendId}']`);
            if (chatBtn) {
                const unreadBadge = chatBtn.querySelector(".unread-badge");
                if (unreadBadge) {
                    console.log("🔴 隐藏小红点");
                    unreadBadge.style.display = "none";
                }
            }

            // ✅ 更新未读消息计数
            updateUnreadCount();
        }
    } catch (err) {
        console.error("❌ 标记消息为已读失败:", err);
    }
}


async function updateUnreadCount() {
    try {
        const response = await fetchWithAuth("https://websocket-server-o0o0.onrender.com/api/chat/unread-count");

        if (!response) {
            console.error("❌ API 返回 `undefined`，可能请求失败");
            return;
        }

        if (!response.success || !response.unreadCounts) {
            console.error("⚠️ 服务器返回未读消息错误:", response);
            return;
        }

        console.log("🔄 更新未读消息数量:", response.unreadCounts);

        // ✅ 遍历所有好友按钮，更新小红点
        document.querySelectorAll(".chat-btn").forEach(btn => {
            const friendId = btn.dataset.friendId.trim();
            const unreadBadge = btn.querySelector(".unread-badge");

            // ✅ 添加调试日志
            console.log("🔍 查找按钮:", `button[data-friend-id='${friendId}']`, "未读数量:", response.unreadCounts[friendId]);

            if (response.unreadCounts.hasOwnProperty(friendId) && response.unreadCounts[friendId] > 0) {
                console.log("✅ 找到未读消息，尝试显示小红点:", friendId);

                if (unreadBadge) {
                    unreadBadge.style.display = "block"; // ✅ 显示小红点
                    console.log("🔴 小红点成功显示！");
                } else {
                    console.warn("⚠️ 未找到小红点元素 (unread-badge)!");
                }
            } else {
                console.log("✅ 没有未读消息，隐藏小红点:", friendId);
                if (unreadBadge) unreadBadge.style.display = "none";
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
window.onload = () => {
    console.log("📌 页面加载完成，开始加载好友列表...");
    
    loadFriendList(); // ✅ 先加载好友列表
    
    setTimeout(() => {
        console.log("⏳ 等待 1 秒后更新未读消息...");
        updateUnreadCount(); // ✅ 确保好友列表加载后再执行
    }, 1000);

    connectWS(); // ✅ 确保 WebSocket 也正常连接
};
