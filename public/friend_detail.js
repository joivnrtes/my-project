// 在 DOMContentLoaded 里做初始化逻辑
   document.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const targetUserId = params.get('userId');
      if (!targetUserId) {
        alert('缺少用户ID');
        history.back();
        return;
      }
// 按钮事件绑定
document.getElementById('btn-send-friend-request')
              .addEventListener('click', sendFriendRequest);
      document.getElementById('btn-cancel')
              .addEventListener('click', cancel);

    // 获取目标用户的详细信息（需要鉴权）
    fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/user/${targetUserId}`)
      .then(result => {
        if (!result.success || !result.data) {
          alert('获取用户信息失败: ' + result.message);
          return;
        }
        const user = result.data;
        console.log("📌 获取的用户数据:", user); // ✅ 这里打印 API 返回的数据

        document.getElementById('username').textContent = user.username;
        document.getElementById('avatar').src = user.avatarUrl || 'https://websocket-server-o0o0.onrender.com/default-avatar.png';
        document.getElementById('height').textContent = '身高(cm): ' + (user.height || '无');
        document.getElementById('armspan').textContent = '臂展(cm): ' + (user.armspan || '无');
        document.getElementById('difficultylevel').textContent = '难度水平: ' + (user.difficultylevel || '无');
        document.getElementById('climbingduration').textContent = '攀岩时长: ' + (user.climbingduration || '未知');
        document.getElementById('climbingpreference').textContent = '攀岩偏好: ' +
          (Array.isArray(user.climbingpreference) ? user.climbingpreference.join(', ') : '无');

    // 修正注册天数字段
        document.getElementById('days').textContent = '注册天数: ' + (user.daysComputed || 0);
        document.getElementById('beta').textContent = '分享 Beta: ' + (user.beta || 0);
      })
      .catch(err => {
        console.error('获取用户信息异常:', err);
        alert('获取用户信息失败，请稍后重试');
      });

    // 申请好友：调用后端接口发起好友请求
    function sendFriendRequest() {
      fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUserId })
      })
      .then(result => {
        if (result.success) {
          alert('好友请求已发送!');
          history.back();
        } else {
          alert('加好友失败: ' + result.message);
        }
      })
      .catch(err => {
        console.error('发送好友请求异常:', err);
        alert('发送好友请求异常，请稍后重试');
      });
    }

    // 取消：返回主页
    function cancel() {
      history.back();
    }
  });