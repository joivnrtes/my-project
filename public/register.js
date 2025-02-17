        document.addEventListener("DOMContentLoaded", function() {
            const durationSelect = document.getElementById("climbing-duration");
    for (let i = 0; i <= 1200; i++) {
        const years = Math.floor(i / 12);
        const months = i % 12;
        const label = `${years > 0 ? years + '年' : ''}${months > 0 ? months + '个月' : ''}` || "0个月";
        
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        durationSelect.appendChild(option);
    }
            document.getElementById("avatar-upload").addEventListener("change", previewAvatar);
            document.getElementById("send-code-btn").addEventListener("click", sendVerificationCode);
            document.getElementById("register-btn").addEventListener("click", validateAndSubmit);

        });
        const API_BASE = 'https://websocket-server-o0o0.onrender.com/api';
        function previewAvatar(event) {
    const avatarPreview = document.getElementById('avatar-preview');
    const file = event.target.files[0];

    if (!file) {
        avatarPreview.src = 'https://websocket-server-o0o0.onrender.com/default-avatar.png';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        avatarPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
}


    
        function sendVerificationCode() {
            const email = document.getElementById('email').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email || !emailRegex.test(email)) {
                alert('请输入有效的邮箱');
                return;
            }

            const button = document.getElementById('send-code-btn');
            button.disabled = true;
            button.textContent = '发送中...';

            fetch(`${API_BASE}/auth/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

                .then((response) => response.json())
                .then((data) => {
                    alert(data.message);
                })
                .catch((error) => {
    console.error('发送验证码错误:', error);
    alert('发送验证码失败，请稍后重试。');
})
.finally(() => {
    button.disabled = false;
    button.textContent = '发送验证码';
});
        }


        function validateAndSubmit(event) {
            event.preventDefault(); // 阻止默认提交行为
            // 接下来处理表单验证和提交逻辑

            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const verificationCode = document.getElementById('verification-code').value.trim();
            const password = document.getElementById('password').value.trim();
            const avatarFile = document.getElementById('avatar-upload').files[0];

            let isValid = true;

            // Validate username
            if (!username) {
                document.getElementById('username-error').textContent = '用户名不能为空';
                isValid = false;
            } else {
                document.getElementById('username-error').textContent = '';
            }

            // Validate email 
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                document.getElementById('email-error').textContent = '请输入有效的邮箱';
                isValid = false;
            } else {
                document.getElementById('email-error').textContent = '';
            }

            // 验证验证码
            if (!verificationCode) {
              document.getElementById('verification-error').textContent = '请输入验证码';
              isValid = false;
            } else {
              document.getElementById('verification-error').textContent = '';
            }


            // Validate password
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
            if (!password || !passwordRegex.test(password)) {
                document.getElementById('password-error').textContent = '密码必须是8到16位的字母、数字和特殊符号组合';
                isValid = false;
            } else {
                document.getElementById('password-error').textContent = '';
            }

            if (!isValid) {
                return; // 如果验证未通过，直接返回
            }
            const jsonData = {
                username: username,
                email: email,
                verificationCode: verificationCode,
                password: password,
                gender: document.getElementById('gender').value.trim() || null,
                height: document.getElementById('height').value.trim() || null,
                armSpan: document.getElementById('arm-span').value.trim() || null,
                difficultyLevel: document.getElementById('difficulty-level').value.trim() || null,
                climbingDuration: document.getElementById('climbing-duration').value.trim() || null,
                climbingPreference: document.getElementById('climbing-preference').value.trim() || null,
           };

            fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json'
                },
                    body: JSON.stringify(jsonData),
                })

                .then(response => {
                    if (!response.ok) {
                      return response.json().then(errorData => {
                          // 打印具体的错误内容
                          console.error('注册请求失败，错误信息:', errorData);
                          throw new Error(errorData.message || '注册请求失败');
                      });
                    }
                    
                    return response.json();
                })
                .then(data => {
                    if (!data.user) {
                
                        throw new Error('用户注册失败');
                    }

                    if (avatarFile) {
                        const formData = new FormData();
                        formData.append('avatar', avatarFile);

                        return fetch(`${API_BASE}/auth/upload-avatar`, {
                            method: 'POST',
                            body: formData,
                        })
                            .then(avatarResponse => avatarResponse.json())
                            .then(avatarData => {
                                if (!avatarData.avatarUrl) {
                                    throw new Error('头像上传失败');
                                }
                                data.user.avatar = avatarData.avatarUrl;
                                return data.user;
                            });
                    }

                    return data.user;
                })
                .then(userInfo => {
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                    alert('注册成功！');
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    console.error('注册出错:', error);
                    alert(`注册失败：${error.message}`);
                });
        }