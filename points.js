document.addEventListener('DOMContentLoaded', function() {
    // 初始化Supabase客户端
    const supabase = supabaseClient;
    
    // 获取DOM元素
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const welcomeUser = document.getElementById('welcomeUser');
    const userPointsDisplay = document.getElementById('userPoints');
    const pointsContent = document.getElementById('pointsContent');
    const notLoggedIn = document.getElementById('notLoggedIn');
    const currentPoints = document.getElementById('currentPoints');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginPromptBtn = document.getElementById('loginPromptBtn');
    const registerPromptBtn = document.getElementById('registerPromptBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const submitLogin = document.getElementById('submitLogin');
    const submitRegister = document.getElementById('submitRegister');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    const registerUsername = document.getElementById('registerUsername');
    const registerPassword = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    const buyButtons = document.querySelectorAll('.buy-btn');
    
    // 检查用户登录状态
    checkUserSession();
    
    // 检查用户会话
    async function checkUserSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Error checking session:', error);
                return;
            }
            
            // 增加调试信息
            console.log('Session check result:', session ? 'Logged in' : 'Not logged in', session);
            
            if (session && session.user) {
                // 用户已登录
                const { user } = session;
                showUserInfo(user);
                fetchUserPoints(user.id);
                showPointsContent();
                return true; // 返回登录状态
            } else {
                // 用户未登录
                showAuthButtons();
                hidePointsContent();
                return false; // 返回登录状态
            }
        } catch (err) {
            console.error('Session check exception:', err);
            showAuthButtons();
            hidePointsContent();
            return false;
        }
    }
    
    // 显示用户信息
    function showUserInfo(user) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        welcomeUser.textContent = `欢迎，${user.email || user.id}`;
    }
    
    // 显示登录/注册按钮
    function showAuthButtons() {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
    
    // 显示积分内容
    function showPointsContent() {
        pointsContent.style.display = 'block';
        notLoggedIn.style.display = 'none';
    }
    
    // 隐藏积分内容
    function hidePointsContent() {
        pointsContent.style.display = 'none';
        notLoggedIn.style.display = 'block';
    }
    
    // 获取用户积分
    async function fetchUserPoints(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', userId)
                .single();
                
            if (error) throw error;
            
            const points = data?.points || 0;
            updatePointsDisplay(points);
        } catch (error) {
            console.error('Error fetching user points:', error);
            showError('获取积分信息失败，请刷新页面重试');
        }
    }
    
    // 更新积分显示
    function updatePointsDisplay(points) {
        if (userPointsDisplay) {
            userPointsDisplay.textContent = `积分: ${points}`;
        }
        if (currentPoints) {
            currentPoints.textContent = `${points} 积分`;
        }
    }
    
    // 购买积分
    async function buyPoints(amount, points) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                showError('请先登录后再购买积分');
                return;
            }
            
            const userId = session.user.id;
            const loadingElement = document.createElement('div');
            loadingElement.className = 'loading-overlay';
            loadingElement.innerHTML = '<div class="loading-spinner"></div><p>正在跳转到支付页面...</p>';
            document.body.appendChild(loadingElement);
            
            try {
                // 调用创建支付API (使用Vercel API路由代理)
                const response = await fetch('/api/create-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        amount: amount,
                        points: points,
                        productName: `购买${points}积分`
                    })
                });
                
                if (!response.ok) {
                    throw new Error('支付创建失败');
                }
                
                const paymentData = await response.json();
                console.log('支付响应数据:', paymentData);
                
                // 获取支付参数 - 兼容 params 和 payment_params 两种返回格式
                const paramsObj = paymentData.payment_params || paymentData.params;
                
                if (!paramsObj) {
                    console.error('支付参数缺失:', paymentData);
                    throw new Error('支付参数缺失');
                }
                
                // 检查支付URL是否存在
                 if (!paymentData.payment_url) {
                     console.error('支付URL缺失:', paymentData);
                     throw new Error('支付URL缺失');
                 }
                 
                 // 修正支付网关域名 - 确保使用正确的域名
                 let correctedPaymentUrl = paymentData.payment_url;
                 if (correctedPaymentUrl.includes('zpayz.cn')) {
                     correctedPaymentUrl = correctedPaymentUrl.replace('zpayz.cn', 'z-pay.cn');
                     console.log('已修正支付网关域名:', correctedPaymentUrl);
                 }
                 
                 // 尝试使用POST表单提交而不是GET请求
                 const form = document.createElement('form');
                 form.method = 'POST';
                 form.action = correctedPaymentUrl;
                 form.target = '_self'; // 在当前窗口中打开，解决Trae预览黑屏问题
                
                // 添加参数
                for (const key in paramsObj) {
                    if (paramsObj.hasOwnProperty(key)) {
                        const hiddenField = document.createElement('input');
                        hiddenField.type = 'hidden';
                        hiddenField.name = key;
                        hiddenField.value = paramsObj[key];
                        form.appendChild(hiddenField);
                    }
                }
                
                console.log('准备提交支付表单到:', paymentData.payment_url);
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
                
            } catch (error) {
                document.body.removeChild(loadingElement);
                console.error('Payment creation error:', error);
                showError('创建支付订单失败，请稍后重试');
            }
        } catch (error) {
            console.error('Error buying points:', error);
            showError('购买积分失败，请稍后重试');
        }
    }
    
    // 显示错误信息
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }
    
    // 隐藏错误信息
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    // 事件监听器
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    registerBtn.addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
    
    loginPromptBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    registerPromptBtn.addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
        });
    });
    
    logoutBtn.addEventListener('click', () => {
        // 直接返回首页，保持登录状态
        window.location.href = 'index.html';
    });
    
    submitLogin.addEventListener('click', async () => {
        const email = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            loginMessage.textContent = '请输入用户名和密码';
            return;
        }
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            loginModal.style.display = 'none';
            loginUsername.value = '';
            loginPassword.value = '';
            loginMessage.textContent = '';
            
            showUserInfo(data.user);
            fetchUserPoints(data.user.id);
            showPointsContent();
        } catch (error) {
            console.error('Error logging in:', error);
            loginMessage.textContent = '登录失败，请检查用户名和密码';
        }
    });
    
    submitRegister.addEventListener('click', async () => {
        const email = registerUsername.value.trim();
        const password = registerPassword.value.trim();
        const confirm = confirmPassword.value.trim();
        
        if (!email || !password || !confirm) {
            registerMessage.textContent = '请填写所有字段';
            return;
        }
        
        if (password !== confirm) {
            registerMessage.textContent = '两次输入的密码不一致';
            return;
        }
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            
            registerModal.style.display = 'none';
            registerUsername.value = '';
            registerPassword.value = '';
            confirmPassword.value = '';
            registerMessage.textContent = '';
            
            if (data.user) {
                showUserInfo(data.user);
                // 创建用户资料
                await createUserProfile(data.user.id);
                fetchUserPoints(data.user.id);
                showPointsContent();
            }
        } catch (error) {
            console.error('Error registering:', error);
            registerMessage.textContent = '注册失败，请稍后重试';
        }
    });
    
    closeErrorBtn.addEventListener('click', hideError);
    
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.getAttribute('data-amount'));
            const points = parseInt(btn.getAttribute('data-points'));
            buyPoints(amount, points);
        });
    });
    
    // 创建用户资料
    async function createUserProfile(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .insert([
                    { id: userId, points: 0 }
                ]);
                
            if (error) throw error;
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }
});