window.addEventListener("load", function () {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          console.log("✅ Service Worker 注册成功", reg);

          // 监听 SW 更新
          reg.onupdatefound = () => {
            const newSW = reg.installing;
            newSW.onstatechange = () => {
              if (newSW.state === 'installed') {
                console.log("🔄 新 Service Worker 可用，建议刷新页面！");
                if (navigator.serviceWorker.controller) {
                  alert("新版本已发布，刷新页面以更新！");
                }
              }
            };
          };
        })
        .catch(err => console.log("❌ Service Worker 注册失败", err));


  navigator.serviceWorker.ready.then(reg => {
    console.log("✅ Service Worker 已激活并可用", reg);
  });
}
});


    document.addEventListener("DOMContentLoaded", function () {
      // 绑定按钮点击事件
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  const openEditProfileBtn = document.getElementById("openEditProfileBtn");
  if (openEditProfileBtn) {
    openEditProfileBtn.addEventListener("click", openEditProfile);
  }
    
  const requestAddFriendBtn = document.getElementById("requestAddFriendBtn");
  if (requestAddFriendBtn) {
    requestAddFriendBtn.addEventListener("click", requestAddFriend);
  }

  const returnToFriendListBtn = document.getElementById("returnToFriendListBtn");
  if (returnToFriendListBtn) {
    returnToFriendListBtn.addEventListener("click", returnToFriendList);
  }

  const deleteChatHistoryBtn = document.getElementById("deleteChatHistoryBtn");
  if (deleteChatHistoryBtn) {
    deleteChatHistoryBtn.addEventListener("click", deleteChatHistory);
  }

  const sendMessageBtn = document.getElementById("sendMessageBtn");
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", sendMessage);
  }

  const goToCommunityPostPageBtn = document.getElementById("goToCommunityPostPageBtn");
  if (goToCommunityPostPageBtn) {
    goToCommunityPostPageBtn.addEventListener("click", goToCommunityPostPage);
  }
  
  const goToStudyPostPageBtn = document.getElementById("goToStudyPostPageBtn");
  if (goToStudyPostPageBtn) {
    goToStudyPostPageBtn.addEventListener("click", goToStudyPostPage);
  }
  
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", saveProfile);
  }

  const closeEditProfileBtn = document.getElementById("closeEditProfileBtn");
  if (closeEditProfileBtn) {
    closeEditProfileBtn.addEventListener("click", closeEditProfile);
  }
  
  const closeFriendInfoBtn = document.getElementById("closeFriendInfoBtn");
  if (closeFriendInfoBtn) {
    closeFriendInfoBtn.addEventListener("click", closeFriendInfo);
  }

  console.log("🔍 当前 URL:", window.location.href);
  console.log("🔑 Access Token:", localStorage.getItem('accessToken'));
  console.log("🔑 Refresh Token:", localStorage.getItem('refreshToken'));
  console.log("📌 用户信息:", localStorage.getItem('userInfo'))
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (!userInfo || (!userInfo._id && !userInfo.id)) {
    alert('请先登录');
    window.location.href = 'login.html';
    return;
  }

  console.log("加载用户信息：", userInfo);

  updateRegistrationDays();
  setInterval(updateRegistrationDays, 60000); 
  setInterval(refreshBeta, 60000);// 每60秒更新一次

  connectWS(); 
    
  loadFriendList();
  loadFriendRequests();
});

    // ========== 模拟的用户数据/好友资料 - 在真实环境中应从后端获取 ==========
    function logout() {
      // 清理本地数据
      localStorage.removeItem('userInfo');
  
      alert("已退出登录");
      // 跳转到登录页
      window.location.href = "login.html";
    }

    // ========== 岩馆数据 ==========
    let gyms = [];              // 用于存放后端返回的所有岩馆
    let allProvinceCityData = {}; // 用于存放省份 - 城市映射
    let provinceSelect, citySelect, searchInput;



    // ========== DOM加载完后的初始化 ==========

      // 从 localStorage 获取用户信息
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    console.log("加载用户信息：", userInfo);

    if (userInfo) {
      // 检查 avatar 字段是否存在或有效
      const avatarUrl = userInfo.avatarUrl && userInfo.avatarUrl.trim() !== ''
    ? userInfo.avatarUrl
    : 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/default-avatar.png';

        // 动态设置头像 URL，添加时间戳避免缓存
        document.getElementById('profile-avatar').src = `${avatarUrl}?timestamp=${new Date().getTime()}`;

        // 渲染用户数据到页面
        document.getElementById('profile-username').textContent = userInfo.username || "未设置";
        document.getElementById('profile-gender').textContent = "性别: " + (userInfo.gender || "未设置");
        document.getElementById('profile-height').textContent = "身高(cm): " + (userInfo.height || "0");
        document.getElementById('profile-armspan').textContent = "臂展(cm): " + (userInfo.armspan || "0");
        document.getElementById('profile-difficultylevel').textContent = "难度水平: " + (userInfo.difficultylevel || "0");
        document.getElementById('profile-climbingduration').textContent = "攀岩时长: " + (userInfo.climbingduration || "0个月");
        document.getElementById('profile-climbingpreference').textContent = "攀岩偏好: " + (userInfo.climbingpreference || "未设置");
        document.getElementById('profile-beta').textContent = userInfo.beta || 0;

    // 更新注册天数：根据 createdAt 字段计算
    // 在渲染用户数据时：
if (userInfo.createdAt) {
  if (userInfo.registrationDays !== undefined) {
    document.getElementById('profile-days').textContent = userInfo.registrationDays;
  } else {
    const registrationDate = new Date(userInfo.createdAt);
    const now = new Date();
    const days = Math.floor((now - registrationDate) / (1000 * 60 * 60 * 24));
    document.getElementById('profile-days').textContent = days;
  }
} else {
  document.getElementById('profile-days').textContent = userInfo.days || 1;
}

  };

  const searchInputCommunity = document.getElementById('search-input-community');
  if (searchInputCommunity) {
    searchInputCommunity.addEventListener('input', renderCommunityPosts);
  }

  const searchInputStudy = document.getElementById('search-input-study');
  if (searchInputStudy) {
    searchInputStudy.addEventListener('input', renderStudyPosts);
  }
    

    // 1. 初始化省市下拉
    provinceSelect = document.getElementById('select-province');
    citySelect = document.getElementById('select-city');
    searchInput = document.getElementById('search-input');
    initProvinceCitySelects();
    // 2. 获取全部岩馆
    fetchAllGyms();

       // 当搜索输入变化时，重新渲染
       searchInput.addEventListener('input', () => {
        renderGymList();
      });

      // 当省份变化时，更新城市下拉并重新渲染
      provinceSelect.addEventListener('change', () => {
        console.log("省份变化，更新城市");
        updateCityOptions();
        renderGymList();
      });

      // 当城市变化时，重新渲染
      citySelect.addEventListener('change', () => {
        renderGymList();
      });

      // 3) 读取 localStorage 的值并切换 Tab
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab && activeTab !== 'tab-personal') {
      // 去掉“个人中心”Tab的 active 状态
      document.querySelector('.tab-item[data-target="tab-personal"]').classList.remove('active');
      document.getElementById('tab-personal').classList.remove('active');

      // 给对应的 tab-item 和 tab-content 加上 active
      document.querySelector(`.tab-item[data-target="${activeTab}"]`).classList.add('active');
      document.getElementById(activeTab).classList.add('active');

      // 如果是社区 Tab，就渲染社区帖子
      if(activeTab === 'tab-community'){
        renderCommunityPosts();
      } 
      // 如果是学习 Tab，就渲染学习帖子
      else if (activeTab === 'tab-study'){
        renderStudyPosts();
      }

      // 用完后删除，避免下一次依然默认为这个标签
      localStorage.removeItem('activeTab');
    }

    // 4) 初始化“edit-climbingduration”下拉：0~1200
    const editTimeSelect = document.getElementById('edit-climbingduration');
    for(let i=0; i<=1200; i++){ 
      const opt = document.createElement('option');
      opt.value = i.toString();
      opt.text = i + "个月";
      editTimeSelect.appendChild(opt);
    }


// ========== 获取省市数据，初始化下拉 ==========
function initProvinceCitySelects() {
  // 先设置默认选项
  provinceSelect.innerHTML = '<option value="">-- 请选择省份 --</option>';
  citySelect.innerHTML = '<option value="">-- 请选择城市 --</option>';

  fetch('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/auth/all')
    .then(response => response.json())
    .then(data => {
      console.log("省市数据：", data);
      // 如果 API 返回的数据被包裹在 data 属性中，则取 data.data，否则直接使用 data
      allProvinceCityData = data.data || data;
      // 假设返回的数据结构是一个对象，例如：
      // {
      //   "北京市": ["北京市"],
      //   "河北省": ["石家庄市", "廊坊市"],
      //   ...
      // }
      const provinces = Object.keys(allProvinceCityData);
      provinces.forEach(prov => {
        const opt = document.createElement('option');
        opt.value = prov;
        opt.textContent = prov;
        provinceSelect.appendChild(opt);
      });
    })
    .catch(err => console.error('获取省市数据出错:', err));
}


    // ========== 当省份选中后，更新城市下拉选项 ==========
    function updateCityOptions() {
  const selectedProvince = provinceSelect.value;
  console.log("选中的省份：", selectedProvince);
  citySelect.innerHTML = '<option value="">-- 请选择城市 --</option>';
  
  if (selectedProvince && allProvinceCityData[selectedProvince]) {
    console.log("对应的城市数组：", allProvinceCityData[selectedProvince]);
    allProvinceCityData[selectedProvince].forEach(city => {
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
}


    // ========== 一次性获取全部岩馆信息 ========== 
    function fetchAllGyms() {
      fetch('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/gym/all')
        .then(response => response.json())
        .then(data => {
          gyms = data; // 拿到后端返回的全国岩馆数据
          console.log('后端返回岩馆数据:', gyms);
          // 第一次获取完后，立即渲染
          renderGymList();
        })
        .catch(err => console.error('加载全国岩馆出错:', err));
    }

    // ========== 渲染岩馆列表，前端做省市+搜索关键字筛选 ==========
    function renderGymList() {
      const shareListEl = document.getElementById('share-list');
      if (!shareListEl) return;
      shareListEl.innerHTML = '';

      const selectedProvince = provinceSelect.value; 
      const selectedCity = citySelect.value;
      const query = (searchInput.value || '').toLowerCase();

      // 遍历 gyms 数组
      gyms.forEach(gym => {
        // 如果后端返回包含 province、city
        // 1) 过滤省份
        if (selectedProvince && gym.province !== selectedProvince) {
          return;
        }
        // 2) 过滤城市
        if (selectedCity && gym.city !== selectedCity) {
          return;
        }
        // 3) 过滤搜索关键词
        if (query && !gym.name.toLowerCase().includes(query)) {
          return;
        }

        // 通过筛选后，创建DOM
        const postDiv = document.createElement('div');
        postDiv.className = 'post';

        // 帖子头部
      const headerDiv = document.createElement('div');
      headerDiv.className = "post-header";

      const titleSpan = document.createElement('span');
      titleSpan.className = "post-title";
      titleSpan.textContent = gym.name;
      // ✅ 使用 addEventListener 绑定事件，避免 CSP 错误
      titleSpan.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.setItem("activeTab", "tab-share");
        setTimeout(() => {
            window.location.href = `gymdetail.html?gymId=${gym.id}`;
        }, 100);
    });
      
      const dateSpan = document.createElement('span');
      dateSpan.className = "post-date";
      dateSpan.textContent = "已有线路: " + gym.routes.length;

      headerDiv.appendChild(titleSpan);
      headerDiv.appendChild(dateSpan);

        // 内容区域(展示地址)
      const contentDiv = document.createElement('div');
      contentDiv.className = "post-content";
      contentDiv.textContent = gym.location;

        // 点赞区(可选)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = "post-actions";

      const btnLike = document.createElement('button');
      btnLike.className = "btn-like";
      btnLike.textContent = "👍";

        btnLike.addEventListener("click", () => {
            gym.likeCount++;
            renderGymList(); // 重新渲染
        });

      const likeCountSpan = document.createElement('span');
      likeCountSpan.className = "like-count";


      actionsDiv.appendChild(btnLike);
      actionsDiv.appendChild(likeCountSpan);

      // 组合
      postDiv.appendChild(headerDiv);
      postDiv.appendChild(contentDiv);
      postDiv.appendChild(actionsDiv);

      shareListEl.appendChild(postDiv);
    });
  }


    // ========== 底部导航切换 ==========
    const tabBar = document.getElementById('tab-bar');
    const tabs = document.querySelectorAll('.tab-content');
    const tabItems = document.querySelectorAll('.tab-item');

    tabBar.addEventListener('click', (e) => {
      const target = e.target.closest('.tab-item');
      if(!target) return;
      tabItems.forEach(item => item.classList.remove('active'));
      tabs.forEach(tab => tab.classList.remove('active'));

      target.classList.add('active');
      const tabId = target.dataset.target;
      document.getElementById(tabId).classList.add('active');

      if(tabId === "tab-share") {
        renderGymList();
      }

      // 如果当前点击的是 tab-community
      if(tabId === "tab-community"){
        renderCommunityPosts();
      }

      // 如果当前点击的是 tab-study
      if(tabId === "tab-study"){
        renderStudyPosts();
      }
    });



      // ========== 社区、学习贴子渲染 ========== 
      function renderCommunityPosts() {
  fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/community/posts')
    .then(data => {
      if (!data.success) {
        alert("获取帖子失败: " + data.message);
        return;
      }
      const posts = data.data; // 获取社区帖子
      const listEl = document.getElementById('community-post-list');
      listEl.innerHTML = '';

      const keyword = (document.getElementById('search-input-community').value || '').toLowerCase();

      posts.forEach(post => {
        // 过滤搜索
        if (
          post.title.toLowerCase().includes(keyword) ||
          post.content.toLowerCase().includes(keyword) ||
          (post.user && post.user.username.toLowerCase().includes(keyword))
        ) {
          // 统一样式，使用 `post` 类
          const postDiv = document.createElement('div');
          postDiv.className = 'post';

          // 帖子头部
          const headerDiv = document.createElement('div');
          headerDiv.className = "post-header";

          const titleSpan = document.createElement('span');
          titleSpan.className = "post-title";
          titleSpan.textContent = post.title;

          titleSpan.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.setItem("activeTab", "tab-community");
            setTimeout(() => {
                window.location.href = `community_detail.html?postId=${post._id}`;
            }, 100);
        });

          const dateSpan = document.createElement('span');
          dateSpan.className = "post-date";
          dateSpan.textContent = `作者: ${post.user?.username || "匿名"} | 点赞: ${post.likeCount || 0}`;

          headerDiv.appendChild(titleSpan);
          headerDiv.appendChild(dateSpan);

          // 内容区域
          const contentDiv = document.createElement('div');
          contentDiv.className = "post-content";
          contentDiv.textContent = (post.content || "").substring(0, 50) + "...";

          // 点赞 & 评论数
          const actionsDiv = document.createElement('div');
          actionsDiv.className = "post-actions";

          const btnLike = document.createElement('button');
          btnLike.className = "btn-like";
          btnLike.textContent = `👍 ${post.likeCount}`;

          btnLike.addEventListener("click", (event) => {
            event.preventDefault();
            likeCommunityPost(post._id, btnLike);
        });


          const commentCountSpan = document.createElement('span');
          commentCountSpan.className = "like-count";
          commentCountSpan.textContent = `💬 ${post.comments.length}`;

          actionsDiv.appendChild(btnLike);
          actionsDiv.appendChild(commentCountSpan);

          // 组合结构
          postDiv.appendChild(headerDiv);
          postDiv.appendChild(contentDiv);
          postDiv.appendChild(actionsDiv);

          listEl.appendChild(postDiv);
        }
      });
    })
    .catch(err => {
      console.error("获取社区帖子异常:", err);
      alert("获取社区帖子异常");
    });
}

function likeCommunityPost(postId, button) {
  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/community/post/${postId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: localStorage.getItem('userId') })
  })
  .then(data => {
    if (data.success) {
      button.textContent = `👍 ${data.likeCount}`; // 直接更新按钮文本
    } else {
      alert("点赞失败：" + data.message);
    }
  })
  .catch(err => {
    console.error("点赞请求异常:", err);
  });
}


function toggleCommentSection(postId, wrapper) {
  let commentSection = wrapper.querySelector('.comment-section');
  
  if (commentSection) {
    wrapper.removeChild(commentSection);
    return;
  }

  commentSection = document.createElement('div');
  commentSection.className = 'comment-section';
  commentSection.style.borderTop = "1px solid #ddd";
  commentSection.style.marginTop = "8px";
  commentSection.style.paddingTop = "8px";

  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/community/post/${postId}`)
    .then(data => {
      if (!data.success) {
        alert("获取评论失败: " + data.message);
        return;
      }

      // 评论列表
      data.data.comments.forEach(comment => {
        const p = document.createElement('p');
        p.style.marginBottom = "5px";
        p.textContent = comment.user.username + ": " + comment.text;
        commentSection.appendChild(p);
      });

      // 添加输入框 & 提交按钮
      const inp = document.createElement('input');
      inp.type = "text";
      inp.placeholder = "写评论...";
      inp.style.width = "70%";
      inp.style.marginRight = "5px";

      const btn = document.createElement('button');
      btn.textContent = "提交";
      btn.addEventListener("click", () => {
                postComment(postId, inp.value, commentSection);
                inp.value = "";
            });


      commentSection.appendChild(inp);
      commentSection.appendChild(btn);

      wrapper.appendChild(commentSection);
    })
    .catch(err => {
      console.error("获取评论异常:", err);
    });
}
function postComment(postId, text, commentSection) {
  if (!text.trim()) {
    alert("请输入评论内容");
    return;
  }

  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/community/post/${postId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: localStorage.getItem('userId'), text: text.trim() })
  })
  .then(data => {
    if (data.success) {
      // 显示新评论
      const p = document.createElement('p');
      p.style.marginBottom = "5px";
      p.textContent = localStorage.getItem('username') + ": " + text.trim();
      commentSection.insertBefore(p, commentSection.lastChild);
    } else {
      alert("评论失败: " + data.message);
    }
  })
  .catch(err => {
    console.error("评论请求异常:", err);
  });
}


function renderStudyPosts() {
  // 从后端获取所有学习帖
  fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/posts')
    .then(data => {
      if (!data.success) {
        alert("获取学习贴失败: " + data.message);
        return;
      }
      const posts = data.data;
      const listEl = document.getElementById('study-post-list');
      listEl.innerHTML = '';

      const keyword = (document.getElementById('search-input-study').value || '').toLowerCase();

      posts.forEach(post => {
        // 筛选：标题、内容、作者都包含关键字才渲染
        if (
          post.title.toLowerCase().includes(keyword) ||
          post.content.toLowerCase().includes(keyword) ||
          (post.user && post.user.username.toLowerCase().includes(keyword))
        ) {
          // 创建DOM
          const postDiv = document.createElement('div');
          postDiv.className = 'post';

          // 帖子头部
          const headerDiv = document.createElement('div');
          headerDiv.className = 'post-header';

          const titleSpan = document.createElement('span');
          titleSpan.className = 'post-title';
          titleSpan.textContent = post.title;
          // 点击标题跳详情
          titleSpan.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.setItem('activeTab', 'tab-study');
            setTimeout(() => {
                window.location.href = `study_detail.html?postId=${post._id}`;
            }, 100);
        });
          const dateSpan = document.createElement('span');
          dateSpan.className = 'post-date';
          dateSpan.textContent = `作者: ${post.user?.username || "匿名"} | 点赞: ${post.likeCount||0}`;

          headerDiv.appendChild(titleSpan);
          headerDiv.appendChild(dateSpan);

          // 帖子内容
          const contentDiv = document.createElement('div');
          contentDiv.className = 'post-content';
          contentDiv.textContent = (post.content || '').substring(0, 50) + '...';

          // 点赞和评论
          const actionsDiv = document.createElement('div');
          actionsDiv.className = "post-actions";

          const btnLike = document.createElement('button');
          btnLike.className = "btn-like";
          btnLike.textContent = `👍 ${post.likeCount||0}`;
          btnLike.addEventListener("click", (e) => {
            e.stopPropagation();
            likeStudyPost(post._id, btnLike);
        });

          // 评论数
          const commentCountSpan = document.createElement('span');
          commentCountSpan.className = "like-count";
          commentCountSpan.textContent = `💬 ${post.comments?.length || 0}`;

          actionsDiv.appendChild(btnLike);
          actionsDiv.appendChild(commentCountSpan);

          postDiv.appendChild(headerDiv);
          postDiv.appendChild(contentDiv);
          postDiv.appendChild(actionsDiv);

          listEl.appendChild(postDiv);
        }
      });
    })
    .catch(err => {
      console.error("获取学习帖子异常:", err);
      alert("获取学习帖子异常");
    });
}

function likeStudyPost(postId, btn) {
  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/study/post/${postId}/like`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" }
  })
    .then(data => {
      if (data.success) {
        btn.textContent = `👍 ${data.likeCount}`;
      } else {
        alert("点赞失败: " + data.message);
      }
    })
    .catch(err => {
      console.error("学习贴点赞错误:", err);
    });
}



    function goToCommunityPostPage() {
      window.location.href = "community_create.html";
    }

    function goToStudyPostPage() {
      window.location.href = "study_create.html";
    }

    // ========== 创建帖子DOM：区分 'community'/'study'，使返回时能跳回正确tab ==========
    function createPostDiv(post, tabType){
      // 最外层容器
      const wrapper = document.createElement('div');
      wrapper.className = 'post';
      // 让“点击整个帖子”就能跳转到详情页
      wrapper.addEventListener("click", (event) => {
        event.preventDefault();
        const page = tabType === 'community' ? 'community_detail.html' : 'study_detail.html';
        localStorage.setItem('activeTab', tabType === 'community' ? 'tab-community' : 'tab-study');
        setTimeout(() => {
            window.location.href = `${page}?postId=${post.id}`;
        }, 100);
    });
  
      // 帖子头部(标题 + 作者)
      const header = document.createElement('div');
      header.className = 'post-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'post-title';
      titleSpan.textContent = post.title + " (作者: " + post.user + ")";
      header.appendChild(titleSpan);

      // 帖子右侧展示评论数和点赞数
      const infoSpan = document.createElement('span');
      infoSpan.className = 'post-date';
      infoSpan.textContent = `评论: ${post.comments.length} | 点赞: ${post.likeCount}`;
      header.appendChild(infoSpan);

      wrapper.appendChild(header);

      // 帖子内容
      const contentDiv = document.createElement('div');
      contentDiv.className = 'post-content';
      contentDiv.textContent = post.content.substring(0, 50) + '...';
      wrapper.appendChild(contentDiv);

      return wrapper;
    }

 // ========== 针对帖子列表的like / delete / comment展开 ========== 

function likePost(postId, tabType){
  let arr = (tabType === 'community') ? communityPosts : studyPosts;
  const post = arr.find(p => p.id === postId);
  if(!post) return;
  post.likeCount++;
  if(tabType === 'community'){
    renderCommunityPosts();
  } else {
    renderStudyPosts();
    }
}

function deletePost(postId, tabType){
  let arr = (tabType === 'community') ? communityPosts : studyPosts;
  const idx = arr.findIndex(p => p.id === postId);
  if(idx === -1) return;
  if(!confirm("确定删除该帖子吗？")) return;
  arr.splice(idx, 1);
  if(tabType === 'community'){
    renderCommunityPosts();
  } else {
    renderStudyPosts();
  }
  alert("帖子已删除！");
}

function toggleCommentSection(postId, tabType, wrapper){
  // 检测一下页面里是否已有评论区div
  let cSection = wrapper.querySelector('.comment-section');
  if(cSection){
    // 如果已经展开，就把它移除(收起)
    wrapper.removeChild(cSection);
    return;
  }

  // 否则创建一个
  cSection = document.createElement('div');
  cSection.className = 'comment-section';
  cSection.style.borderTop = "1px solid #ddd";
  cSection.style.marginTop = "8px";
  cSection.style.paddingTop = "8px";

  // 找到帖子
  let arr = (tabType === 'community') ? communityPosts : studyPosts;
  const post = arr.find(p => p.id === postId);
  if(!post) return;

  // 1) 评论列表
  const listDiv = document.createElement('div');
  post.comments.forEach(cmt => {
    const p = document.createElement('p');
    p.style.marginBottom = "5px";
    p.textContent = cmt.user + ": " + cmt.text;
    listDiv.appendChild(p);
  });
  cSection.appendChild(listDiv);

  // 2) 添加评论输入框
  const inp = document.createElement('input');
  inp.type = "text";
  inp.placeholder = "写评论...";
  inp.style.width = "70%";
  inp.style.marginRight = "5px";

  const btn = document.createElement('button');
  btn.textContent = "提交";
  btn.addEventListener("click", () => {
    const txt = inp.value.trim();
    if (!txt) {
        alert("请输入评论内容");
        return;
    }
    // 假设当前用户是“用户1”
    post.comments.push({ user: "用户1", text: txt });
    inp.value = "";
    // 重新渲染一下评论列表
    cSection.remove();
    toggleCommentSection(postId, tabType, wrapper);
  });

  cSection.appendChild(inp);
  cSection.appendChild(btn);

  // 插到 wrapper 末尾
  wrapper.appendChild(cSection);
}


// ========== 好友逻辑 ==========
    function requestAddFriend(){
  const username = document.getElementById('search-friend-input').value.trim();
  console.log('搜索用户名:', username);
  if(!username){
    alert('请输入用户名');
    return;
  }
  // 使用 encodeURIComponent 以确保特殊字符正确传输
  fetch(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/user/search?keyword=${encodeURIComponent(username)}`)
    .then(response => response.json())  // 先解析成 JSON
    .then(data => {
      console.log('搜索结果:', data);
      if (!data.success || !data.data || data.data.length === 0) {
        alert('未找到该用户');
        return;
      }
      // 如果搜索到了用户，则获取第一个用户的信息
      const targetUser = data.data[0];
      // 跳转到 friend_detail.html，并在 URL 中附加查询参数 userId
      window.location.href = `friend_detail.html?userId=${targetUser._id}`;
    })
    .catch(err => {
      console.error('搜索用户异常:', err);
      alert('搜索用户失败，请稍后重试');
    });
}

// 加载当前用户收到的好友请求（待处理的）
function loadFriendRequests() {
  fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/friend-request/received')
    .then(result => {
      if (!result.success) {
        console.error('获取好友请求失败:', result.message);
        return;
      }
      const requests = result.data;
      const requestListEl = document.getElementById('friend-request-list');
      requestListEl.innerHTML = '';
      if (requests.length === 0) {
        requestListEl.innerHTML = '<p>暂无好友请求</p>';
        return;
      }
      requests.forEach(req => {
        // req 应该已 populate('from', 'username avatarUrl')，显示基本信息
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.style.cursor = 'pointer';
        // 创建内容区
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';

        const img = document.createElement('img');
        img.src = req.from.avatarUrl || 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/default-avatar.png';
        img.alt = '头像';
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.borderRadius = '50%';
        img.style.marginRight = '10px';
        div.appendChild(img);

        const span = document.createElement('span');
        span.textContent = req.from.username;
        div.appendChild(span);

        li.appendChild(div);

        // 创建按钮
        const btn = document.createElement('button');
        btn.textContent = '查看详情';
        btn.addEventListener('click', function(event) {
          event.stopPropagation();
          viewFriendRequestDetail(req._id);
        });
        li.appendChild(btn);
        requestListEl.appendChild(li);
      });
    })
    .catch(err => {
      console.error('加载好友请求异常:', err);
    });
}

// 点击好友请求后，跳转到详情页面
function viewFriendRequestDetail(requestId) {
  window.location.href = `friend_request_detail.html?requestId=${requestId}`;
}

// 页面加载完毕后调用
document.addEventListener('DOMContentLoaded', function () {
  loadFriendList();
  loadFriendRequests();
});


function loadFriendList() {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
if (!userInfo || (!userInfo._id && !userInfo.id)) {
  alert("请先登录");
  window.location.href = "login.html";
  return;
}

const userId = userInfo._id || userInfo.id;
if (!userId) {
        console.error("无法获取用户 ID，无法加载好友列表");
        return;
    }

  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/user/${userId}/friends`)
    .then(result => {
      if (!result.success) {
        console.error('获取好友列表失败:', result.message);
        return;
      }
      const friends = result.data;
      const friendListEl = document.getElementById('friend-list');
      friendListEl.innerHTML = ''; // 清空原有内容

      if (friends.length === 0) {
        friendListEl.innerHTML = '<p>暂无好友</p>';
        return;
      }

      friends.forEach(friend => {
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.style.cursor = 'pointer';
        // 创建第一个 div，用于显示头像和用户名
          const infoDiv = document.createElement('div');
          infoDiv.style.display = 'flex';
          infoDiv.style.alignItems = 'center';

          // 创建头像 img
          const img = document.createElement('img');
          img.src = friend.avatarUrl || 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/default-avatar.png';
          img.alt = '头像';
          img.style.width = '40px';
          img.style.height = '40px';
          img.style.borderRadius = '50%';
          img.style.marginRight = '10px';
          infoDiv.appendChild(img);

          // 创建用户名 span
          const nameSpan = document.createElement('span');
          nameSpan.className = 'friend-name';
          nameSpan.textContent = friend.username;
          nameSpan.setAttribute('data-user-id', friend._id);
          nameSpan.style.color = '#5690d8';
          nameSpan.style.textDecoration = 'underline';
          nameSpan.style.cursor = 'pointer';
          infoDiv.appendChild(nameSpan);

          li.appendChild(infoDiv);

  // 为用户名绑定点击事件，跳转到好友详情页
  nameSpan.addEventListener('click', function (event) {
    event.stopPropagation();
    const userId = nameSpan.getAttribute('data-user-id');
    window.location.href = `friend_info.html?userId=${userId}`;
  });

  // 创建第二个 div，用于放置按钮
  const btnDiv = document.createElement('div');

  // 创建“聊天”按钮
  const chatBtn = document.createElement('button');
  chatBtn.textContent = '聊天';
  chatBtn.addEventListener('click', function(event) {
    event.stopPropagation();
    enterChat(event, friend._id, friend.username);
  });
  btnDiv.appendChild(chatBtn);

  // 创建“删除”按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', function(event) {
    event.stopPropagation();
    deleteFriend(event, friend._id);
  });
  btnDiv.appendChild(deleteBtn);

  li.appendChild(btnDiv);

  // 将 li 添加到好友列表容器中
  friendListEl.appendChild(li);
              });
            })
    .catch(err => {
      console.error('加载好友列表异常:', err);
    });
}



    function handleFriendRequest(requestId, action) {
  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/friend-request/${requestId}/handle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })  // 'accept'或'reject'
  })
  .then(data => {
    if (data.success) {
      alert(`处理成功: ${action === 'accept' ? '已接受' : '已拒绝'}`);
      // 这里可以调用刷新好友请求列表的逻辑
    } else {
      alert('处理失败: ' + (data.message || '未知错误'));
    }
  })
  .catch(err => {
    console.error('处理好友请求异常:', err);
    alert('请求处理失败，请稍后重试');
  });
}



function openFriendInfo(event, targetUserId) {
  event.stopPropagation();
  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/user/${targetUserId}`)
    .then(result => {
      if (!result.success || !result.data) {
        alert('用户信息获取失败: ' + result.message);
        return;
      }
      // 拿到对方信息再渲染
      const friendData = result.data;
      document.getElementById('friend-info-avatar').src = friendData.avatarUrl || 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/default-avatar.png';
      document.getElementById('friend-info-username').textContent = friendData.username;
      document.getElementById('friend-info-gender').textContent = `性别: ${friendData.gender || '无'}`;
      document.getElementById('friend-info-height').textContent = `身高(cm): ${friendData.height || 0}`;
      document.getElementById('friend-info-armspan').textContent = `臂展(cm): ${friendData.armspan || 0}`;
      document.getElementById('friend-info-difficultylevel').textContent = `难度水平: ${friendData.difficultylevel || '5.6'}`;
      document.getElementById('friend-info-climbingduration').textContent = `攀岩时长: ${friendData.climbingduration || '未知'}`;
      document.getElementById('friend-info-climbingpreference').textContent = `攀岩偏好: ${friendData.climbingpreference || '无'}`;
      document.getElementById('friend-info-days').textContent = `注册天数: ${friendData.days || 0}`;
      document.getElementById('friend-info-beta').textContent = `分享Beta: ${friendData.beta || 0}`;

      document.getElementById('friend-info-overlay').style.display = 'flex';
    })
    .catch(err => {
      console.error('获取好友信息异常:', err);
      alert('获取好友信息失败，请稍后重试');
    });
}

    function closeFriendInfo(){
      document.getElementById('friend-info-overlay').style.display = 'none';
    }

    function deleteFriend(event, friendId) {
  event.stopPropagation();
  if (!confirm(`确定删除该好友?`)) return;

  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/friend-request/${friendId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(data => {
    if (data.success) {
      alert('好友删除成功');
      loadFriendList(); // 重新加载好友列表

      // 退出聊天
      if (currentChatUser === friendId) {
        returnToFriendList();
        currentChatUser = '';
      }
    } else {
      alert('删除失败: ' + data.message);
    }
  })
  .catch(err => {
    console.error('删除好友异常:', err);
    alert('删除失败，请稍后再试');
  });
}


function getCurrentUserId() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  return (userInfo._id || userInfo.id).toString();
}
    // ========== 聊天 ==========
    let currentChatUser = ''; // 当前聊天的用户ID
    let currentChatUsername = ''; // 显示的用户名

    function enterChat(event, friendId, friendUsername) {
      const chatMessagesEl = document.getElementById('chat-messages');
      chatMessagesEl.innerHTML = '';
    
      event.stopPropagation();
    
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (!userInfo || (!userInfo._id && !userInfo.id)) {
        alert("用户信息获取失败，请重新登录");
        return;
      }
    
      currentChatUser = friendId;
      currentChatUsername = friendUsername;
      document.getElementById('chat-title').textContent = `与 ${friendUsername} 的聊天`;
    
      document.getElementById('friend-list-container').style.display = 'none';
      document.getElementById('chat-container').style.display = 'block';
    
      // ✅ 发送 WebSocket 事件，通知进入聊天（但确保 WebSocket 连接已建立）
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWSMessage({ type: "enter_chat", to: friendId });
      }
    
      const currentUserId = getCurrentUserId();
    
      // ✅ 加载历史聊天记录，确保不重复渲染
      fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/chat/history?friendId=${friendId}`)
        .then(data => {
          if (!data.success) {
            alert('获取聊天记录失败');
            return;
          }
    
          const existingMessages = new Set();
          Array.from(chatMessagesEl.children).forEach(msg => existingMessages.add(msg.textContent.trim()));
    
          data.chats.forEach(chat => {
            const bubbleType = (chat.from._id.toString() === currentUserId) ? 'me' : 'friend';
            
            // ✅ 只渲染新消息，避免重复
            if (!existingMessages.has(chat.message.trim())) {
              const bubble = createBubble(chat.message, bubbleType, chat.timestamp);
              chatMessagesEl.appendChild(bubble);
            }
          });
    
          chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        })
        .catch(err => console.error('获取聊天记录失败:', err));
    }
    
    function returnToFriendList() {
      document.getElementById('chat-container').style.display = 'none';
      document.getElementById('friend-list-container').style.display = 'block';
    }

    function createBubble(text, type, timestamp) {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', type);
  
  // 检查 timestamp 是否有效
  const dateObj = timestamp ? new Date(timestamp) : new Date();
  const timeEl = document.createElement('div');
  timeEl.classList.add('timestamp');
  
  // 如果 dateObj 无效，则不显示时间，或设置为默认值
  if (isNaN(dateObj.getTime())) {
    timeEl.textContent = "";
  } else {
    timeEl.textContent = dateObj.toLocaleTimeString();
  }
  
  bubble.innerHTML = text;
  bubble.appendChild(timeEl);
  return bubble;
}



    function sendMessage() {
  const chatInputEl = document.getElementById('chat-input');
  const chatMessagesEl = document.getElementById('chat-messages');
  const message = chatInputEl.value.trim();

  if (!message) {
    alert('请输入消息内容');
    return;
  }

  if (!currentChatUser) {
    alert('请选择聊天对象');
    return;
  }

  const myMsg = createBubble(message, 'me');
  chatMessagesEl.appendChild(myMsg);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  // 发送消息到服务器
  fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/chat/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: currentChatUser, message })
  })
  .then(data => {
    if (!data.success) {
      alert('消息存储失败');
    }
  })
  .catch(err => console.error('消息存储失败:', err));

  chatInputEl.value = '';
}


function deleteChatHistory() {
  if (!confirm('确定删除该好友的所有聊天记录？')) return;

  fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/chat/history?friendId=${currentChatUser}`, {
    method: 'DELETE'
  })
    .then(data => {
      if (data.success) {
        alert('聊天记录已删除');
        document.getElementById('chat-messages').innerHTML = '';
        sendWSMessage({ type: 'delete_chat', to: currentChatUser });

        // ✅ 退出聊天界面，返回好友列表
        returnToFriendList();
      } else {
        alert('删除聊天记录失败');
      }
    })
    .catch(err => console.error('删除聊天记录异常:', err));
}





   
    // ========== 编辑资料弹窗 ==========
    const overlay = document.getElementById('edit-profile-overlay');

        // 定义一个函数用于更新注册天数显示
        function updateRegistrationDays() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  if (userInfo && userInfo.createdAt) {
    if (userInfo.registrationDays !== undefined) {
      document.getElementById('profile-days').textContent = userInfo.registrationDays;
    } else {
      const registrationDate = new Date(userInfo.createdAt);
      const now = new Date();
      const days = Math.floor((now - registrationDate) / (1000 * 60 * 60 * 24));
      document.getElementById('profile-days').textContent = days;
    }
  }
}

async function refreshBeta() {
  const storedUser = JSON.parse(localStorage.getItem('userInfo'));
  if (!storedUser || !storedUser.id) return;
  try {
    // 假设你的后端接口为 GET /api/user/:userId
    const response = await fetchWithAuth(`https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/user/${storedUser.id}`);
    if (response.success) {
      const updatedUser = response.data;
      // 更新 localStorage 中的用户数据
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      // 更新页面 beta 显示（这里假设你的页面元素 id 为 'profile-beta'）
      document.getElementById('profile-beta').textContent = updatedUser.beta || 0;
    }
  } catch (error) {
    console.error("刷新 beta 值出错:", error);
  }
}




    function openEditProfile() {
      document.getElementById('edit-username').value 
        = document.getElementById('profile-username').textContent;
      document.getElementById('edit-gender').value 
        = document.getElementById('profile-gender').textContent.replace("性别: ","");
      document.getElementById('edit-height').value 
        = document.getElementById('profile-height').textContent.replace("身高(cm): ","");
      document.getElementById('edit-armspan').value 
        = document.getElementById('profile-armspan').textContent.replace("臂展(cm): ","");
      document.getElementById('edit-difficultylevel').value 
        = document.getElementById('profile-difficultylevel').textContent.replace("难度水平: ","");

      const climbingdurationText = document.getElementById('profile-climbingduration').textContent.replace("攀岩时长: ","");
      const months = isNaN(parseInt(convertClimbingdurationToMonths(climbingdurationText)))
  ? 0
  : parseInt(convertClimbingdurationToMonths(climbingdurationText));


      const climbingpreferenceText = document.getElementById('profile-climbingpreference').textContent.replace("攀岩偏好: ","");
      const arrclimbingPreference = climbingpreferenceText.split("，");
      const editClimbingpreference = document.getElementById('edit-climbingpreference');
      for(let i=0; i<editClimbingpreference.options.length; i++){
        editClimbingpreference.options[i].selected = false;
      }
      for(let i=0; i<editClimbingpreference.options.length; i++){
        if(arrclimbingPreference.includes(editClimbingpreference.options[i].value)){
          editClimbingpreference.options[i].selected = true;
        }
      }

      overlay.style.display = "flex";
    }

    function closeEditProfile() {
      overlay.style.display = "none";
      document.getElementById('error-username').textContent = '';
      document.getElementById('error-climbingpreference').textContent = '';
    }

    function convertClimbingdurationToMonths(str){
      if(str.includes("个月")){
        return parseInt(str) || 0;
      }
      if(str.includes("半年")){
        return 6; 
      }
      return 0;
    }

    function saveProfile() {
      const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
      const newUsername = document.getElementById('edit-username').value.trim();
      const newGender   = document.getElementById('edit-gender').value;
      const newHeight   = document.getElementById('edit-height').value;
      const newArmspan = document.getElementById('edit-armspan').value;
      const newDifficultylevel    = document.getElementById('edit-difficultylevel').value;
      const newClimbingduration    = document.getElementById('edit-climbingduration').value;
      const climbingpreferenceSelect = document.getElementById('edit-climbingpreference');
      let newClimbingpreference = Array.from(climbingpreferenceSelect.selectedOptions).map(opt => opt.value);
      
      if (!newUsername) {
        document.getElementById('error-username').textContent = '用户名不能为空';
        return;
      }
      document.getElementById('error-username').textContent = '';

      if (!newHeight || isNaN(newHeight) || newHeight <= 0) {
       alert('请输入有效的身高');
       return;
      }

      if (!newArmspan || isNaN(newArmspan) || newArmspan <= 0) {
        alert('请输入有效的臂展');
       return;
      }

      if (!newClimbingpreference || newClimbingpreference.length === 0) {
        document.getElementById('error-climbingpreference').textContent = '请选择至少一种攀岩偏好';
        return;
      }
      document.getElementById('error-climbingpreference').textContent = '';

      // 攀岩时长格式化
      const months = parseInt(newClimbingduration, 10);
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      const climbingDurationText = `${years > 0 ? `${years}年` : ''}${remainingMonths > 0 ? `${remainingMonths}个月` : ''}` || '0个月';

      // 更新展示
      document.getElementById('profile-username').textContent = newUsername || "未设置";
      document.getElementById('profile-gender').textContent   = "性别: " + (newGender||"不想透露");
      document.getElementById('profile-height').textContent   = "身高(cm): " + (newHeight || "0");
      document.getElementById('profile-armspan').textContent = "臂展(cm): " + (newArmspan || "0");
      document.getElementById('profile-difficultylevel').textContent    = "难度水平: " + (newDifficultylevel||"0");
      document.getElementById('profile-climbingduration').textContent = `攀岩时长: ${climbingDurationText}`;
      document.getElementById('profile-climbingpreference').textContent = `攀岩偏好: ${newClimbingpreference.join('，')}`;

      let updatedUserInfo = {
        username: newUsername,
        gender: newGender,
        height: newHeight,
        armspan: newArmspan,
        difficultylevel: newDifficultylevel,
        climbingduration: climbingDurationText,
        climbingpreference: newClimbingpreference,
        
      };
      // 定义一个函数，调用后端更新资料接口
      function updateProfile() {
      fetchWithAuth('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/auth/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 假设 token 存在 localStorage
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify(updatedUserInfo)
    })
    .then(data => {
      if (data.success) {
        console.log("更新资料接口返回的数据:", data.user);
        // 用后端返回的数据更新 localStorage（如有需要）
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        // 所有更新完成后，关闭编辑窗口和提示
        closeEditProfile();
        alert('资料更新成功！');
      } else {
        alert('资料更新失败：' + data.message);
      }
    })
    .catch(error => {
      console.error('更新资料错误：', error);
      alert('更新资料出错，请稍后重试');
    });
  }
  

    const avatarFile = document.getElementById('edit-avatar').files[0];
    if (avatarFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']; // 允许的文件类型
      const maxSize = 2 * 1024 * 1024; // 最大 2MB
      if (!allowedTypes.includes(avatarFile.type)) {
  alert(`文件格式无效，当前格式: ${avatarFile.type}。仅支持 JPG, PNG 或 GIF`);
  return;
}

if (avatarFile.size > maxSize) {
  alert(`文件大小不能超过 2MB。当前文件大小: ${(avatarFile.size / 1024 / 1024).toFixed(2)}MB`);
  return;
}
      const formData = new FormData();
      formData.append('avatar', avatarFile);

    // 添加超时检测和错误反馈
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      alert('头像上传超时，请稍后重试。');
    }, 10000);

    fetch('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/auth/upload-avatar', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
      .then(response => {
        clearTimeout(timeout); // 清除超时检测
        if (!response.ok) {
          throw new Error('上传头像失败');
        }
        return response.json();
      })
      .then(data => {
        if (data.avatarUrl) {
          // 更新页面头像
          document.getElementById('profile-avatar').src = `${data.avatarUrl}?timestamp=${Date.now()}`;
        // 将 avatarUrl 加入更新的数据中
        updatedUserInfo.avatarUrl = data.avatarUrl;
        let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
        userInfo.avatarUrl = data.avatarUrl;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        alert('头像上传成功！');
        // 头像上传成功后再调用更新资料接口
        updateProfile();
      } else {
        throw new Error('上传头像失败，未返回 URL');
      }
    })
    .catch(error => {
      clearTimeout(timeout);
      console.error('头像上传错误:', error);
      alert('上传头像失败，请稍后重试。');
    });
  } else {
    // 如果没有头像文件，直接调用更新资料接口
    updateProfile();
  }

    }