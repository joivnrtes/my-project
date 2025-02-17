let postId = null;
// 当前帖子信息
let currentPost = null;
// 当前用户ID(假设在登录后写入 localStorage)
const currentUserId = localStorage.getItem('userId') || "";

// 页面加载后绑定事件并获取帖子详情
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  postId = params.get('postId');
  if (!postId) {
    alert("缺少帖子ID");
    goBack();
    return;
  }

  // 绑定返回按钮点击事件
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', goBack);
  }

  // 绑定删除帖子按钮点击事件
  const delBtn = document.getElementById('btn-delete-post');
  if (delBtn) {
    delBtn.addEventListener('click', deletePost);
  }

  // 绑定发表评论按钮点击事件
  const submitCommentBtn = document.getElementById('btn-submit-comment');
  if (submitCommentBtn) {
    submitCommentBtn.addEventListener('click', submitComment);
  }

  // 获取帖子详情
  fetchPostDetail();
});

// ========== 1) 获取帖子详情 ==========
function fetchPostDetail() {
  fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/community/post/${postId}`)
    .then(data => {
      if (!data.success) {
        alert("帖子不存在或已删除");
        goBack();
        return;
      }
      currentPost = data.data;
      renderPost(currentPost);
    })
    .catch(err => {
      console.error("获取帖子详情出错:", err);
      alert("请求失败");
      goBack();
    });
}

// ========== 2) 渲染帖子到页面 ==========
function renderPost(post) {
  // 1. 帖子标题
  document.getElementById('post-title').textContent = post.title || "(无标题)";
  // 2. 作者+时间
  const author = post.user?.username || "匿名";
  const timeStr = new Date(post.createdAt).toLocaleString();
  if (post.user && post.user._id) {
    document.getElementById('post-meta').innerHTML =
      `作者: <a href="friend_detail.html?userId=${post.user._id}">${author}</a> | ${timeStr}`;
  } else {
    document.getElementById('post-meta').textContent = `作者: ${author} | ${timeStr}`;
  }
  // 3. 点赞数
  document.getElementById('like-count').textContent = (post.likeCount || 0) + "赞";
  // 4. 帖子内容
  document.getElementById('post-content').textContent = post.content || "";
  // 5. 帖子视频
  if (post.video) {
    document.getElementById('post-video-container').style.display = "block";
    document.getElementById('post-video').src = post.video;
  } else {
    document.getElementById('post-video-container').style.display = "none";
  }
  // 6. 只有作者能显示“删除帖子”按钮
  const delBtn = document.getElementById('btn-delete-post');
  if (post.user && post.user._id === currentUserId) {
    delBtn.style.display = "inline-block";
  } else {
    delBtn.style.display = "none";
  }
  // 7. 点赞事件（建议使用 addEventListener 代替直接赋值）
  const likeBtn = document.getElementById('btn-like');
  if (likeBtn) {
    // 清除可能已有的事件监听，避免重复绑定（可选）
    likeBtn.replaceWith(likeBtn.cloneNode(true)); 
    const freshLikeBtn = document.getElementById('btn-like');
    freshLikeBtn.addEventListener('click', () => likePost(post._id));
  }
  // 8. 渲染评论
  renderComments(post.comments || []);
}

// ========== 3) 点赞帖子 ==========
function likePost(pId) {
  fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/community/post/${pId}/like`, {
    method: 'POST'
  })
    .then(data => {
      if (data.success) {
        // 更新点赞数
        currentPost.likeCount = data.likeCount;
        document.getElementById('like-count').textContent = data.likeCount + "赞";
      } else {
        alert("点赞失败: " + data.message);
      }
    })
    .catch(err => {
      console.error("点赞出错:", err);
      alert("点赞请求错误");
    });
}

// ========== 4) 删除帖子 ==========
function deletePost() {
  if (!confirm("确认删除该帖子吗？")) return;
  fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/community/post/${postId}`, {
    method: 'DELETE'
  })
    .then(data => {
      if (!data.success) {
        alert("删除失败: " + data.message);
        return;
      }
      alert("帖子已删除");
      goBack();
    })
    .catch(err => {
      console.error("删除帖子出错:", err);
      alert("删除帖子请求失败");
    });
}

// ========== 5) 提交评论（支持上传视频） ==========
async function submitComment() {
  const text = document.getElementById('comment-text').value.trim();
  const fileInput = document.getElementById('comment-video-file');
  const file = fileInput.files[0];

  if (!text && !file) {
    alert("请至少输入文字或上传视频");
    return;
  }

  let finalVideoUrl = ""; 
  // 如果用户选择了本地视频文件，就先上传
  if (file) {
    try {
      const formData = new FormData();
      formData.append('videoFile', file);

      const uploadData = await fetchWithAuth('https://websocket-server-o0o0.onrender.com/api/upload/video', {
        method: 'POST',
        body: formData
      });
      if (!uploadData.success) {
        alert("上传视频失败: " + uploadData.message);
        return;
      }
      finalVideoUrl = uploadData.videoPath; 
    } catch (err) {
      console.error("视频上传异常:", err);
      alert("视频上传失败");
      return;
    }
  }

  // 再向后端提交评论
  const bodyData = {
    text: text,
    video: finalVideoUrl
  };

  fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/community/post/${postId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  })
    .then(data => {
      if (!data.success) {
        alert("评论失败: " + data.message);
        return;
      }
      // 更新 currentPost.comments（后端返回最新的评论数组）
      currentPost.comments = data.data;
      renderComments(currentPost.comments);

      // 清空输入
      document.getElementById('comment-text').value = "";
      document.getElementById('comment-video-file').value = "";
    })
    .catch(err => {
      console.error("评论请求失败:", err);
      alert("提交评论出错");
    });
}

// ========== 6) 渲染评论列表 ==========
function renderComments(comments) {
  const listEl = document.getElementById('comments-list');
  listEl.innerHTML = "";

  comments.forEach(c => {
    const cItem = document.createElement('div');
    cItem.className = "comment-item";

    // 评论者+时间
    const who = c.user?.username || "匿名";
    const timeStr = new Date(c.createdAt).toLocaleString();
    const meta = document.createElement('div');
    meta.className = "comment-meta";
    
    if (c.user && c.user._id) {
      meta.innerHTML = `评论者: <a href="friend_detail.html?userId=${c.user._id}">${who}</a> | ${timeStr}`;
    } else {
      meta.textContent = `评论者: ${who} | ${timeStr}`;
    }
    cItem.appendChild(meta);

    // 评论文字
    const contentDiv = document.createElement('div');
    contentDiv.className = "comment-content";
    contentDiv.textContent = c.text || "";
    cItem.appendChild(contentDiv);

    // 如有视频，显示视频
    if (c.video) {
      const vid = document.createElement('video');
      vid.className = "comment-video";
      vid.controls = true;
      vid.src = c.video;
      cItem.appendChild(vid);
    }

    // 若为当前用户的评论，显示“删除”按钮
    if (c.user?._id === currentUserId) {
      const delBtn = document.createElement('button');
      delBtn.className = "btn-delete-comment";
      delBtn.textContent = "删";
      delBtn.addEventListener('click', () => deleteComment(c._id));
      cItem.appendChild(delBtn);
    }

    listEl.appendChild(cItem);
  });

  // 滚动到底部
  listEl.scrollTop = listEl.scrollHeight;
}

// ========== 7) 删除评论 ==========
function deleteComment(commentId) {
  if (!confirm("确定删除这条评论吗？")) return;
  fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/community/post/${postId}/comment/${commentId}`, {
    method: 'DELETE'
  })
    .then(data => {
      if (!data.success) {
        alert("删除评论失败: " + data.message);
        return;
      }
      // 删除成功后，重新加载帖子详情或仅更新评论
      fetchPostDetail();
    })
    .catch(err => {
      console.error("删除评论请求失败:", err);
      alert("删除评论出错");
    });
}

// 通用的返回函数
function goBack() {
  history.back();
}
