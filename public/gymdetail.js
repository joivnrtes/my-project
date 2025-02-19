    // 获取 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const gymId = urlParams.get('gymId');

  // 如果没有 gymId，则直接返回或跳回首页
  if (!gymId) {
    alert("缺少岩馆ID参数，返回首页");
    window.location.href = 'index.html';
  }

  function fetchGymDetail(id) {
    fetch(`https://websocket-server-o0o0.onrender.com/api/gym/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('获取岩馆详情失败');
        }
        return response.json();
      })
      .then(gym => {
        console.log("后端返回的单个岩馆数据:", gym);
        // 1) 设置顶部标题
        document.getElementById('gym-name-header').textContent = gym.name || '未知岩馆';
        // 2) 基本信息
        document.getElementById('gym-name').textContent = gym.name || '无';
        document.getElementById('gym-province').textContent = `省份：${gym.province || ''}`;
        document.getElementById('gym-city').textContent = `城市：${gym.city || ''}`;
        document.getElementById('gym-location').textContent = `地址：${gym.location || ''}`;
        // 3) 渲染线路
        renderRouteList(gym.routes || []);
      })
      .catch(err => {
        console.error(err);
        alert('加载岩馆数据出错');
        window.location.href = 'index.html';
      });
  }



  function renderRouteList(routes) {
  const listEl = document.getElementById('route-list');
  listEl.innerHTML = "";

  routes.forEach((route, idx) => {
    const li = document.createElement('li');
    li.className = "route-item";

    // 顶部：标题 & 创建者
    const headerDiv = document.createElement('div');
    headerDiv.className = "route-header";

    const titleSpan = document.createElement('span');
    titleSpan.className = "route-title";
    titleSpan.textContent = route.routeName;
    titleSpan.addEventListener('click', () => {
          window.location.href = `routeDetail.html?gymId=${gymId}&routeId=${route._id}`;
        });

    const creatorSpan = document.createElement('span');
    creatorSpan.className = "route-creator";
    creatorSpan.textContent = route.creator ? route.creator : ' ';

    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(creatorSpan);

    // 中间：难度
    const diffP = document.createElement('p');
    diffP.style.fontSize = "14px";
    diffP.style.color = "#666";
    diffP.textContent = `难度：${route.difficulty || '未知'}`;

    // 只添加标题、创建者和难度，不添加点赞相关的部分
    li.appendChild(headerDiv);
    li.appendChild(diffP);
    listEl.appendChild(li);
  });
}

    window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gymId = urlParams.get('gymId');
    if (!gymId) {
      alert("缺少岩馆ID参数，返回首页");
      window.location.href = 'index.html';
      return;
    }
    // 发请求拿后端单个岩馆数据
    fetchGymDetail(gymId);
  });  
  // 把链接 href 改成带上 ?gymId=xxx
  const addRouteLink = document.getElementById('add-route-link');
  addRouteLink.href = `addnew.html?gymId=${gymId}`;
  
  // “返回”按钮事件绑定
  document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
      });
      