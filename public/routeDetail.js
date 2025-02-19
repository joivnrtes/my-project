    let gymId = null;
    let routeId = null;
    let currentRoute = null;
    // 当前用户ID（登录后写入 localStorage）
    const currentUserId = localStorage.getItem('userId') || "";


    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('btn-back').addEventListener('click', goBack);
      document.getElementById('btn-delete-route').addEventListener('click', deleteRoute);
      document.getElementById('btn-submit-comment').addEventListener('click', addComment);
      document.getElementById('btn-like-route').addEventListener('click', () => likeRoute(routeId));
      const params = new URLSearchParams(window.location.search);
      gymId = params.get('gymId');
      routeId = params.get('routeId');
      if (!gymId || !routeId) {
        alert("缺少参数 gymId 或 routeId");
        goBack();
        return;
      }
      fetchRouteDetail(gymId, routeId);
    });



    // 1) 获取路线详情
    function fetchRouteDetail(gymId, routeId){
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/route/${routeId}`)
        .then(data => {
          if(!data.success){
            alert("获取线路失败: " + data.message);
            goBack();
            return;
          }
          currentRoute = data.data; // 后端返回 { success: true, data: route }
          renderRoute(currentRoute);
        })
        .catch(err => {
          console.error("请求出错:", err);
          alert("请求出错");
          goBack();
        });
    }

    // 2) 渲染路线
    function renderRoute(route){
      // 路线标题
      document.getElementById('route-title').textContent 
        = route.routeName || "（无名称）";

      // meta: 难度 / 作者 / 时间
      const authorName = route.user?.username || "匿名";
      const authorId = route.user?._id; // 获取作者ID
      const difficulty = route.difficulty || "未知难度";
      const timeStr = new Date(route.createdAt).toLocaleString();
      if (authorId) {
      document.getElementById('route-meta').innerHTML = 
        `难度: ${difficulty} | 作者: <a href="friend_detail.html?userId=${authorId}">${authorName}</a> | ${timeStr}`;
    } else {
      document.getElementById('route-meta').textContent = 
        `难度: ${difficulty} | 作者: ${authorName} | ${timeStr}`;
    }

      // 点赞数
      document.getElementById('route-like').textContent 
        = (route.likeCount || 0) + "赞";

      // 描述
      document.getElementById('route-description').textContent 
        = route.comment || ""; // 例如你后端是存在 .comment 或 .description ?

      // 如果有视频
      if(route.video){
        document.getElementById('route-video-container').style.display = "block";
        document.getElementById('route-video').src = route.video;
      } else {
        document.getElementById('route-video-container').style.display = "none";
      }

      // 只有作者能删除
      const delBtn = document.getElementById('btn-delete-route');
      if(route.user && route.user._id === currentUserId){
        delBtn.style.display = "inline-block";
      } else {
        delBtn.style.display = "none";
      }

      
      // 渲染评论
      renderCommentList(route.comments || []);
    }

    // 3) 点赞路线
    function likeRoute(rId){
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/route/${rId}/like`, {
        method: 'POST'
      })
      .then(data => {
        if(!data.success){
          alert("点赞失败: " + data.message);
          return;
        }
        // 点赞成功后重新加载线路数据
        fetchRouteDetail(gymId, routeId);
      })
      .catch(err => {
        console.error("点赞出错:", err);
        alert("点赞出错");
      });
    }

    // 4) 删除路线
    function deleteRoute(){
      if(!confirm("确定删除这条路线吗？")) return;
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/route/${routeId}`, {
        method: 'DELETE'
      })
      .then(data => {
        if(!data.success){
          alert("删除失败: " + data.message);
          return;
        }
        alert("路线已删除");
        goBack();
      })
      .catch(err => {
        console.error("删除路线出错:", err);
        alert("删除路线请求异常");
      });
    }

    // 5) 提交评论(可上传视频)
    async function addComment(){
      const txt = document.getElementById('cmt-text').value.trim();
      const file = document.getElementById('cmt-video-file').files[0];
      if(!txt && !file){
        alert("请至少填写文字或上传视频");
        return;
      }

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
            alert("上传评论视频失败: " + uploadData.message);
            return;
          }
          videoUrl = uploadData.videoPath;
        } catch (err){
          console.error("评论视频上传异常:", err);
          return;
        }
      }

      // 发评论
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/route/${routeId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt, video: videoUrl })
      })
      .then(data => {
        if(!data.success){
          alert("评论失败: " + data.message);
          return;
        }
        // 评论成功 => 重新加载线路信息
        fetchRouteDetail(gymId, routeId);
        // 清空输入
        document.getElementById('cmt-text').value = "";
        document.getElementById('cmt-video-file').value = "";
      })
      .catch(err => {
        console.error("评论请求出错:", err);
        alert("评论请求异常");
      });
    }

    // 6) 渲染评论列表
    function renderCommentList(comments){
      const listEl = document.getElementById('comment-list');
      listEl.innerHTML = "";

      comments.forEach(cmt => {
        const cItem = document.createElement('div');
        cItem.className = "comment-item";

        // 评论作者 + 时间
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
        const contentDiv = document.createElement('div');
        contentDiv.className = "comment-content";
        contentDiv.textContent = cmt.text || "(无文字)";
        cItem.appendChild(contentDiv);

        // 若评论有 video
        if(cmt.video){
          const vid = document.createElement('video');
          vid.className = "comment-video";
          vid.controls = true;
          vid.src = cmt.video;
          cItem.appendChild(vid);
        }

        // 如果是当前用户 => 显示删除按钮
        if(cmt.user?._id === currentUserId){
          const delBtn = document.createElement('button');
          delBtn.className = "btn-delete-comment";
          delBtn.textContent = "删";
          delBtn.addEventListener('click', () => deleteComment(cmt._id));
          cItem.appendChild(delBtn);
        }

        listEl.appendChild(cItem);
      });

      // 滚动到底部
      listEl.scrollTop = listEl.scrollHeight;
    }

    // 7) 删除评论
    function deleteComment(commentId){
      if(!confirm("确定删除此评论吗？")) return;
      fetchWithAuth(`https://websocket-server-o0o0.onrender.com/api/gym/${gymId}/route/${routeId}/comment/${commentId}`, {
        method: 'DELETE'
      })
      .then(data => {
        if(!data.success){
          alert("删除评论失败: " + data.message);
          return;
        }
        // 删除成功 => 刷新线路详情
        fetchRouteDetail(gymId, routeId);
      })
      .catch(err => {
        console.error("删除评论出错:", err);
        alert("删除评论请求异常");
      });
    }

    function goBack() {
      history.back();
    }
