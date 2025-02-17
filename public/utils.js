// 1️⃣ 处理带 Token 的请求
async function fetchWithAuth(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    console.warn('🚨 未登录，跳转到登录页面');
    alert('请先登录！');
    logoutUser();
    throw new Error('用户未登录');
  }

  // 设置请求头
  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${accessToken}`;
  
  if (!(options.body instanceof FormData) && !(options.method === 'DELETE' && !options.body)) {
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
  }

  try {
    let response = await fetch(url, options);

    // === 如果 Token 过期，自动尝试刷新 ===
    if (response.status === 401 || response.status === 403) {
      console.warn('🔄 Token 可能已过期，尝试刷新...');

      const refreshed = await attemptRefreshToken();
      if (refreshed) {
        // ✅ 重新获取 Token 并重新请求
        accessToken = localStorage.getItem('accessToken');
        options.headers['Authorization'] = `Bearer ${accessToken}`;
        response = await fetch(url, options);
      } else {
        console.error('❌ Token 刷新失败，跳转到登录页');
        logoutUser();
      }
    }

    return response.json();
  } catch (err) {
    console.error('❌ fetchWithAuth 请求失败:', err);
    throw err;
  }
}

// 2️⃣ 尝试刷新 Token
async function attemptRefreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    console.warn('🚨 无 refreshToken，无法刷新');
    return false;
  }

  try {
    const res = await fetch('https://websocket-server-o0o0.onrender.com/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) {
      console.error('❌ 刷新 Token 失败:', await res.text());
      return false;
    }

    const data = await res.json();
    if (data.accessToken && data.refreshToken) {
      // ✅ 更新 Token 并存入 localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('✅ Token 刷新成功:', data.accessToken);

      return true;
    }

    return false;
  } catch (err) {
    console.error('❌ 刷新 Token 出错:', err);
    return false;
  }
}

// 3️⃣ 用户登出并清除 Token
function logoutUser() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  alert('登录已过期，请重新登录');
  window.location.href = 'login.html';
}
