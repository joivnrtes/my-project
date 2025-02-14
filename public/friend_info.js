   document.addEventListener('DOMContentLoaded', () => {
      // 从 URL 参数中获取目标用户的 ID
      const params = new URLSearchParams(window.location.search);
      const targetUserId = params.get('userId');
      if (!targetUserId) {
        alert('缺少用户ID');
        history.back();
        return;
      }
      // 绑定事件
      document.getElementById('btn-cancel').addEventListener('click', cancel);

    // 获取目标用户的详细信息（需要鉴权）
    fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/user/${targetUserId}`)
      .then(result => {
        if (!result.success || !result.data) {
          alert('获取用户信息失败: ' + result.message);
          return;
        }
        const user = result.data;
        document.getElementById('username').textContent = user.username;
        document.getElementById('avatar').src = user.avatarUrl || 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/default-avatar.png';
        document.getElementById('height').textContent = '身高(cm): ' + (user.height || '无');
        document.getElementById('armspan').textContent = '臂展(cm): ' + (user.armspan || '无');
        document.getElementById('difficultylevel').textContent = '难度水平: ' + (user.difficultylevel || '无');
        document.getElementById('climbingduration').textContent = '攀岩时长: ' + (user.climbingduration || '未知');
        document.getElementById('climbingpreference').textContent = '攀岩偏好: ' +
          (Array.isArray(user.climbingpreference) ? user.climbingpreference.join(', ') : '无');
        document.getElementById('days').textContent = '注册天数: ' + (user.days || 0);
        document.getElementById('beta').textContent = '分享 Beta: ' + (user.beta || 0);
      })
      .catch(err => {
        console.error('获取用户信息异常:', err);
        alert('获取用户信息失败，请稍后重试');
      });
    });


    // 取消：返回主页
    function cancel() {
      history.back();
    }