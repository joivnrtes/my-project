let postId = null;
    let currentPost = null;
    // 当前登录用户ID（登录完成后写入 localStorage）
    const currentUserId = localStorage.getItem('userId') || "";

    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      postId = params.get('postId');
      if (!postId) {
        alert("缺少 postId");
        history.back();
        return;
      }

      document.getElementById("btn-back").addEventListener("click", () => history.back());
      document.getElementById("btn-delete-post").addEventListener("click", deletePost);
      document.getElementById("btn-like").addEventListener("click", () => likePost(postId));
      document.getElementById("btn-submit-comment").addEventListener("click", submitComment);
      fetchPostDetail();
    });

    // 1) 获取帖子详情
    function fetchPostDetail(){
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${postId}`)
        .then(data => {
          if(!data.success){
            alert("帖子不存在或已被删除");
            goBack();
            return;
          }
          currentPost = data.data;
          renderPost(currentPost);
        })
        .catch(err => {
          console.error("获取帖子详情出错:", err);
          alert("请求异常");
          goBack();
        });
    }

    // 2) 渲染帖子
    function renderPost(post){
      // 帖子标题
      document.getElementById('post-title').textContent = post.title || "(无标题)";
      // 作者 + 时间
      const authorName = post.user?.username || "匿名";
      const timeString = new Date(post.createdAt).toLocaleString();
      if (post.user && post.user._id) {
      // 将作者名包裹在 a 标签内，点击后跳转到 friend_detail.html?userId=...
      document.getElementById('post-meta').innerHTML =
        `作者: <a href="friend_detail.html?userId=${post.user._id}">${authorName}</a> | ${timeString}`;
    } else {
      document.getElementById('post-meta').textContent = `作者: ${authorName} | ${timeString}`;
    }
      // 点赞数
      document.getElementById('like-count').textContent = (post.likeCount || 0) + "赞";
      // 帖子内容
      document.getElementById('post-content').textContent = post.content || "";

      // 如果有视频
      if (post.video) {
        document.getElementById('post-video-container').style.display = "block";
        document.getElementById('post-video').src = post.video;
      } else {
        document.getElementById('post-video-container').style.display = "none";
      }

      // 只有作者能看见“删除帖子”
      const delBtn = document.getElementById('btn-delete-post');
      if (post.user && post.user._id === currentUserId) {
        delBtn.style.display = "inline-block";
      } else {
        delBtn.style.display = "none";
      }

      // 渲染评论
      renderComments(post.comments || []);
    }

    // 3) 点赞帖子
    function likePost(pid){
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${pid}/like`, {
        method: 'POST'
      })
      .then(data => {
        if(!data.success){
          alert("点赞失败: " + data.message);
          return;
        }
        // 更新点赞数
        currentPost.likeCount = data.likeCount;
        document.getElementById('like-count').textContent = data.likeCount + "赞";
      })
      .catch(err => {
        console.error("点赞请求出错:", err);
        alert("点赞请求异常");
      });
    }

    // 4) 删除帖子
    function deletePost(){
      if(!confirm("确定删除该帖子吗？")) return;
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${postId}`, {
        method: 'DELETE'
      })
      .then(data => {
        if(!data.success){
          alert("删除帖子失败: " + data.message);
          return;
        }
        alert("帖子已删除");
        goBack();
      })
      .catch(err => {
        console.error("删除帖子请求出错:", err);
        alert("删除帖子请求异常");
      });
    }

    // 5) 提交评论
    async function submitComment(){
      const text = document.getElementById('comment-text').value.trim();
      const file = document.getElementById('comment-video-file').files[0];

      if(!text && !file){
        alert("请至少输入文字或上传视频");
        return;
      }

      let finalVideoUrl = "";
      // 如果用户上传视频，先上传到后端
      if (file) {
        try {
          const formData = new FormData();
          formData.append('videoFile', file);

          const uploadData = await fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/upload/video', {
            method: 'POST',
            body: formData
          });
          if(!uploadData.success){
            alert("评论视频上传失败: " + uploadData.message);
            return;
          }
          finalVideoUrl = uploadData.videoPath;
        } catch (err) {
          console.error("评论视频上传异常:", err);
          alert("评论视频上传异常");
          return;
        }
      }

      // 再发评论请求
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, video: finalVideoUrl })
      })
      .then(data => {
        if(!data.success){
          alert("评论失败: " + data.message);
          return;
        }
        // 后端返回最新的评论数组
        currentPost.comments = data.data;
        renderComments(currentPost.comments);

        // 清空输入框
        document.getElementById('comment-text').value = "";
        document.getElementById('comment-video-file').value = "";
      })
      .catch(err => {
        console.error("评论请求出错:", err);
        alert("评论请求异常");
      });
    }

    // 6) 渲染评论
    function renderComments(comments){
      const listEl = document.getElementById('comments-list');
      listEl.innerHTML = "";

      comments.forEach(cmt => {
        const cItem = document.createElement('div');
        cItem.className = "comment-item";

        // 评论者 + 时间
        const userName = cmt.user?.username || "匿名";
        const timeStr = new Date(cmt.createdAt).toLocaleString();

        const meta = document.createElement('div');
        meta.className = "comment-meta";
       // 如果评论者存在并且有 _id，则用链接包裹用户名
       if (cmt.user && cmt.user._id) {
        meta.innerHTML = `评论者: <a href="friend_detail.html?userId=${cmt.user._id}">${userName}</a> | ${timeStr}`;
      } else {
         meta.textContent = `评论者: ${userName} | ${timeStr}`;
       }

        cItem.appendChild(meta);

        // 评论内容
        const content = document.createElement('div');
        content.className = "comment-content";
        content.textContent = cmt.text || "(无文字)";
        cItem.appendChild(content);

        // 如果评论含视频
        if (cmt.video) {
          const vid = document.createElement('video');
          vid.className = "comment-video";
          vid.controls = true;
          vid.src = cmt.video;
          cItem.appendChild(vid);
        }

        // 如果是当前用户 => 显示“删”按钮
        if (cmt.user?._id === currentUserId) {
          const delBtn = document.createElement('button');
          delBtn.className = "btn-delete-comment";
          delBtn.textContent = "删";
          delBtn.addEventListener('click', () => {
            deleteComment(cmt._id);
          });
          cItem.appendChild(delBtn);
        }

        listEl.appendChild(cItem);
      });

      // 滚动到底部
      listEl.scrollTop = listEl.scrollHeight;
    }

    // 7) 删除评论
    function deleteComment(commentId){
      if(!confirm("确定删除这条评论吗？")) return;
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${postId}/comment/${commentId}`, {
        method: 'DELETE'
      })
      .then(data => {
        if(!data.success){
          alert("删除评论失败: " + data.message);
          return;
        }
        // 刷新帖子或仅更新评论
        fetchPostDetail();
      })
      .catch(err => {
        console.error("删除评论请求异常:", err);
        alert("删除评论请求异常");
      });
    }