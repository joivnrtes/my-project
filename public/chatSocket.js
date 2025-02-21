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

window.onload = connectWS;
window.connectWS = connectWS;
window.sendWSMessage = sendWSMessage;
