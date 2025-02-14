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

       // 绑定登录表单提交事件
    document.getElementById('login-form').addEventListener('submit', function(event) {
      event.preventDefault(); // 防止默认表单提交行为

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) {
          alert('请填写所有字段');
          return;
      }

      // 调用后端登录 API
      fetch('https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api/auth/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email, password: password })
      })
      .then(response => {
          if (!response.ok) {
              return response.json().then(err => { throw new Error(err.message || '登录失败'); });
          }
          return response.json();
      })
      .then(data => {
          console.log('后端返回的数据:', data);
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('userInfo', JSON.stringify(data.user));
          if (data.user && data.user.id) {
              localStorage.setItem('userId', data.user.id);
          }
          alert('登录成功！');
          window.location.href = 'index.html';
      })
      .catch(error => {
          console.error('登录错误:', error);
          alert(error.message);
      });
    });

    // 为注册和忘记密码按钮绑定点击事件
    document.getElementById('redirectToRegister').addEventListener('click', function() {
        window.location.href = 'register.html';
    });
    document.getElementById('forgotPassword').addEventListener('click', function() {
        window.location.href = 'forgot-password.html';
    });
});
               