document.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const requestId = params.get('requestId');
      if (!requestId) {
        alert('缺少请求ID');
        window.location.href = 'index.html';
        return;
      }

      // 获取按钮引用并绑定事件
      document.getElementById('btn-accept').addEventListener('click', () => handleRequest('accept'));
      document.getElementById('btn-reject').addEventListener('click', () => handleRequest('reject'));
      document.getElementById('btn-back').addEventListener('click', goBack);


    // 获取好友请求详情（要求后端提供 GET /api/friend-request/:requestId 接口，并 populate 'from' 字段）
    fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/friend-request/${requestId}`)
      .then(result => {
        if (!result.success || !result.data) {
          alert('获取好友请求详情失败: ' + result.message);
          window.location.href = 'index.html';
          return;
        }
        const friendReq = result.data;
        // 确保 friendReq.from 包含发起者信息
        if (!friendReq.from) {
          alert('好友请求数据不完整');
          window.location.href = 'index.html';
          return;
        }
        const fromUser = friendReq.from;
        document.getElementById('avatar').src = fromUser.avatarUrl || 'https://websocket-server-o0o0.onrender.com/default-avatar.png';
        document.getElementById('username').textContent = '用户名: ' + fromUser.username;
        document.getElementById('gender').textContent = '性别: ' + (fromUser.gender || '未设置');
        document.getElementById('height').textContent = '身高(cm): ' + (fromUser.height || '0');
        document.getElementById('armspan').textContent = '臂展(cm): ' + (fromUser.armspan || '0');
        document.getElementById('difficultylevel').textContent = '难度水平: ' + (fromUser.difficultylevel || '未设置');
        document.getElementById('climbingduration').textContent = '攀岩时长: ' + (fromUser.climbingduration || '未设置');
        document.getElementById('climbingpreference').textContent = '攀岩偏好: ' + (Array.isArray(fromUser.climbingpreference) ? fromUser.climbingpreference.join(', ') : '无');
        document.getElementById('days').textContent = '注册天数: ' + (fromUser.days || 0);
        document.getElementById('beta').textContent = '分享 Beta: ' + (fromUser.beta || 0);
      })
      .catch(err => {
        console.error('获取好友请求详情异常:', err);
        alert('获取好友请求详情失败，请稍后重试');
        window.location.href = 'index.html';
      });

    // 处理好友请求（接受或拒绝）
    function handleRequest(action) {
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/friend-request/${requestId}/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      .then(result => {
        if (result.success) {
          alert(`请求已${action === 'accept' ? '接受' : '拒绝'}`);
        } else {
          alert('处理请求失败: ' + result.message);
        }
        window.location.href = 'index.html';
      })
      .catch(err => {
        console.error('处理请求异常:', err);
        alert('处理请求异常，请稍后重试');
        window.location.href = 'index.html';
      });
    }

    function goBack() {
      window.location.href = 'index.html';
    }
});