        const API_BASE = 'https://my-project-pkbo1zqno-ans-projects-cdc13964.vercel.app/api';
        document.addEventListener('DOMContentLoaded', () => {
            // 绑定按钮事件
            document.getElementById('send-code-btn').addEventListener('click', sendVerificationCode);
            document.getElementById('reset-btn').addEventListener('click', validateAndResetPassword);
            document.getElementById('back-btn').addEventListener('click', goBack);
        });
        function sendVerificationCode() {
            const email = document.getElementById('email').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (!email || (!emailRegex.test(email) )) {
                document.getElementById('email-error').textContent = '请输入有效的邮箱';
                return;
            } else {
        document.getElementById('email-error').textContent = '';
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
                    // 恢复按钮状态
                    button.disabled = false;
                    button.textContent = '发送验证码';
                });
        }

        function validateAndResetPassword() {
            const email = document.getElementById('email').value.trim();
            const verificationCode = document.getElementById('verification-code').value.trim();
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            let isValid = true;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10,11}$/;
            if (!email || (!emailRegex.test(email) && !phoneRegex.test(email))) {
                document.getElementById('email-error').textContent = '请输入有效的邮箱';
                isValid = false;
            } else {
                document.getElementById('email-error').textContent = '';
            }

            if (!verificationCode) {
                document.getElementById('verification-error').textContent = '请输入验证码';
                isValid = false;
            } else {
                document.getElementById('verification-error').textContent = '';
            }

            // 密码必须含字母、数字和特殊字符，长度8~16
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
            if (!newPassword || !passwordRegex.test(newPassword)) {
                document.getElementById('password-error').textContent = '密码必须是8到16位的字母、数字和特殊符号组合';
                isValid = false;
            } else {
                document.getElementById('password-error').textContent = '';
            }

            if (newPassword !== confirmPassword) {
                document.getElementById('confirm-password-error').textContent = '两次输入的密码不一致';
                isValid = false;
            } else {
                document.getElementById('confirm-password-error').textContent = '';
            }
            
            if (!isValid) {
                return; // 如果验证未通过，直接返回
            }
            const jsonData = {
                email: email,
                verificationCode: verificationCode,
                newPassword: newPassword,
           };
           const resetButton = document.getElementById('reset-btn');
            resetButton.disabled = true;
            resetButton.textContent = '重置中...';

            fetch(`${API_BASE}/auth/forgot-password`, {
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
                          console.error('重制密码请求失败，错误信息:', errorData);
                          throw new Error(errorData.message || '重制密码请求失败');
                      });
                    }
                    
                    return response.json();
                })
                .then(data => {
                    alert('密码重置成功！');
                window.location.href = 'login.html';
            })
            .catch((error) => {
                console.error('重置密码出错:', error);
                alert(`重置密码失败：${error.message}`);
            })
            .finally(() => {
                resetButton.disabled = false;
                resetButton.textContent = '重置密码';
            });
                }
                function goBack() {
                  window.location.href = 'login.html';
                }