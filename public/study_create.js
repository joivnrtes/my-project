        document.addEventListener("DOMContentLoaded", () => {
      const submitBtn = document.getElementById('submit-post-btn');
      const cancelBtn = document.getElementById('cancel-post-btn');

      submitBtn.addEventListener('click', submitPost);
      cancelBtn.addEventListener('click', cancelPost);
    });
    
    function cancelPost(){
      // 返回首页并切换到“学习交流”Tab
      localStorage.setItem('activeTab','tab-study');
      window.location.href = 'index.html';
    }

    async function submitPost(){
      const title = document.getElementById('post-title').value.trim();
      const content = document.getElementById('post-content').value.trim();
      const file = document.getElementById('post-video').files[0];

      if(!title){
        alert("请填写帖子标题");
        return;
      }

      // 先上传视频（若有）
      let videoUrl = "";
      if(file){
        try {
          const formData = new FormData();
          formData.append('videoFile', file);

          const uploadData = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/upload/video', {
            method: 'POST',
            body: formData
          });

          if(!uploadData.success){
            alert("视频上传失败: " + uploadData.message);
            return;
          }
          videoUrl = uploadData.videoPath; // 后端返回的URL
        } catch (err){
          console.error("视频上传异常:", err);
          return;
        }
      }

      // 再发帖
      try {
        const data = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/study/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, video: videoUrl })
        });
        if(!data.success){
          alert("发帖失败: " + data.message);
          return;
        }
        alert("发帖成功！");
        localStorage.setItem('activeTab','tab-study');
        window.location.href = 'index.html';
      } catch(err){
        console.error("发帖请求错误:", err);
        alert("发帖请求错误");
      }
    }