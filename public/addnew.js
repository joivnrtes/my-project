      document.addEventListener('DOMContentLoaded', () => {
      // 给按钮绑定事件
      const submitBtn = document.getElementById('submit-btn');
      const cancelBtn = document.getElementById('cancel-btn');

      submitBtn.addEventListener('click', submitRoute);
      cancelBtn.addEventListener('click', cancelAdd);
    });


    async function submitRoute(){
      const name = document.getElementById('route-name').value.trim();
      const diff = document.getElementById('route-difficulty').value.trim();
      const cmt  = document.getElementById('route-comment').value.trim();
      const fileInput = document.getElementById('route-video-file');
      const file = fileInput.files[0];

      if(!name){
        alert("请填写线路名称");
        return;
      }


  const urlParams = new URLSearchParams(window.location.search);
  const gymId = urlParams.get('gymId'); // 例如 "2"

  if(!gymId){
    alert("没有岩馆 ID, 无法提交");
    return;
  }

  // =============== 第1步：如果用户选了视频文件，就上传到后端 /api/upload/video ===============
  let videoUrl = ""; // 如果用户不选视频，这里保持空字符串
  if (file) {
    try {
      // 用 FormData 包装文件
      const formData = new FormData();
      formData.append('videoFile', file);

      // 这里用 fetchWithAuth，如果需要鉴权就要带 token
      const uploadData = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/upload/video', {
        method: 'POST',
        body: formData
      });
      if (!uploadData.success) {
        alert("视频上传失败: " + (uploadData.message || ""));
        return;
      }
      videoUrl = uploadData.videoPath; // 后端返回的存储路径
    } catch (err) {
      console.error("视频上传异常:", err);
      alert("视频上传异常，请重试");
      return;
    }
  }
  
// =============== 第2步：再调用“添加线路”接口，把 videoUrl 放进 body 里 ===============
try {
    const data = await fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/addRoute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeName: name,
        difficulty: diff,
        comment: cmt,
        video: videoUrl
      })
    });
    if (!data.success) {
      alert("添加线路失败: " + (data.message || ""));
      return;
    }

    alert("线路已成功添加！");
    // 跳转回 gymdetail.html 并带上 gymId
    window.location.href = `gymdetail.html?gymId=${gymId}`;
  } catch (err) {
    console.error("提交线路时出错:", err);
    alert("提交线路时出错");
  }
}

function cancelAdd(){
  window.history.back();
}