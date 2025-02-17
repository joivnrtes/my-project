// 等待 DOM 加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
  // 获取按钮元素
  const btnSubmit = document.getElementById('submitPostBtn');
  const btnCancel = document.getElementById('cancelPostBtn');

  // 为取消按钮绑定点击事件
  btnCancel.addEventListener('click', cancelPost);
  
  // 为发布按钮绑定点击事件
  btnSubmit.addEventListener('click', submitPost);
  
  // 如有需要，可以获取来自 localStorage 的其他状态
  const fromTab = localStorage.getItem('fromTab') || 'tab-community';
});

// 取消发帖，返回主页并切换到野攀社区 Tab
function cancelPost(){
  localStorage.setItem('activeTab', 'tab-community'); // 或根据实际情况调整
  window.location.href = 'index.html';
}

// 发帖函数，包含视频上传（如果选择了文件）和提交帖子数据
async function submitPost(){
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const fileInput = document.getElementById('post-video');
  const file = fileInput.files[0];

  if (!title) {
    alert("请填写帖子标题");
    return;
  }

  let videoUrl = "";
  if (file) {
    try {
      const formData = new FormData();
      formData.append('videoFile', file);

      const uploadData = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/upload/video', {
        method: 'POST',
        body: formData
      });
      if (!uploadData.success) {
        alert("视频上传失败: " + uploadData.message);
        return;
      }
      videoUrl = uploadData.videoPath;
    } catch (err) {
      console.error("视频上传异常:", err);
      alert("视频上传异常");
      return;
    }
  }

  // 发送发帖请求
  try {
    const data = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/community/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, video: videoUrl })
    });
    if (!data.success) {
      alert("发帖失败: " + data.message);
      return;
    }
    alert("发帖成功");
    // 切换到野攀社区 Tab 并返回主页
    localStorage.setItem('activeTab', 'tab-community');
    window.location.href = 'index.html';
  } catch(err) {
    console.error("发帖请求错误:", err);
    alert("发帖请求错误");
  }
}
