// 使用全局Supabase客户端
let supabaseClient;

document.addEventListener('DOMContentLoaded', function() {
    // 获取全局Supabase客户端
    supabaseClient = window.supabaseClient;
    
    // 添加会话状态变化监听
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            console.log('用户已登录');
            checkUserSession();
        } else if (event === 'SIGNED_OUT') {
            console.log('用户已登出');
            updateUIForLoggedOutUser();
        } else if (event === 'TOKEN_REFRESHED') {
            console.log('会话已刷新');
            checkUserSession();
        }
    });
});

// 当前用户信息
window.currentUser = null;
window.userPoints = 0;

// DOM元素
let authElements = {};

// 确保在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化认证功能
    initAuth();
});

// 初始化认证功能
function initAuth() {
    // 获取DOM元素
    authElements = {
        authButtons: document.getElementById('authButtons'),
        userInfo: document.getElementById('userInfo'),
        loginBtn: document.getElementById('loginBtn'),
        registerBtn: document.getElementById('registerBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        loginModal: document.getElementById('loginModal'),
        registerModal: document.getElementById('registerModal'),
        closeModalBtns: document.querySelectorAll('.close-modal'),
        submitLogin: document.getElementById('submitLogin'),
        submitRegister: document.getElementById('submitRegister'),
        welcomeUser: document.getElementById('welcomeUser'),
        userPointsDisplay: document.getElementById('userPoints'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        registerUsername: document.getElementById('registerUsername'),
        registerPassword: document.getElementById('registerPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        loginMessage: document.getElementById('loginMessage'),
        registerMessage: document.getElementById('registerMessage')
    };

    // 添加事件监听器
    authElements.loginBtn.addEventListener('click', () => showModal(authElements.loginModal));
    authElements.registerBtn.addEventListener('click', () => showModal(authElements.registerModal));
    authElements.logoutBtn.addEventListener('click', logout);
    authElements.submitLogin.addEventListener('click', login);
    authElements.submitRegister.addEventListener('click', register);
    
    // 关闭模态框
    authElements.closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            authElements.loginModal.style.display = 'none';
            authElements.registerModal.style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === authElements.loginModal) {
            authElements.loginModal.style.display = 'none';
        }
        if (e.target === authElements.registerModal) {
            authElements.registerModal.style.display = 'none';
        }
    });

    // 检查用户会话
    checkUserSession();
}

// 显示模态框
function showModal(modal) {
    modal.style.display = 'block';
}

// 检查用户会话
async function checkUserSession() {
    try {
        // 确保所有DOM元素已加载
        if (!authElements || !authElements.welcomeUser) {
            console.log('DOM元素尚未准备好，稍后再试');
            setTimeout(checkUserSession, 100);
            return;
        }
        
        console.log('正在检查用户会话状态...');
        // 强制刷新会话状态
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('获取会话出错:', error);
            updateUIForLoggedOutUser();
            return;
        }
        
        console.log('会话状态:', session ? '已登录' : '未登录', session);
        
        if (session && session.user) {
            // 用户已登录
            window.currentUser = session.user;
            updateUIForLoggedInUser(session.user);
            fetchUserPoints(session.user.id);
        } else {
            // 用户未登录
            window.currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (err) {
        console.error('检查会话时出错:', err);
        updateUIForLoggedOutUser();
    }
}

// 获取用户资料
async function getUserProfile() {
    try {
        if (!window.currentUser || !window.currentUser.id) {
            console.error('获取用户资料错误: 用户未登录或ID不存在');
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('username, points')
            .eq('id', window.currentUser.id)
            .single();
        
        if (error) throw error;
        
        if (data) {
            if (window.currentUser) {
                window.currentUser.username = data.username;
            }
            window.userPoints = data.points || 0;
        }
    } catch (error) {
        console.error('获取用户资料错误:', error.message);
    }
}

// 获取用户积分
async function fetchUserPoints(userId) {
    try {
        if (!userId) {
            console.error('获取用户积分错误: 用户ID不存在');
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        
        const points = data?.points || 0;
        window.userPoints = points;
        
        // 更新积分显示
        if (authElements && authElements.userPointsDisplay) {
            authElements.userPointsDisplay.textContent = `积分: ${points}`;
        }
        
        return points;
    } catch (error) {
        console.error('获取用户积分错误:', error.message);
        return 0;
    }
}

// 更新已登录用户的UI
function updateUIForLoggedInUser() {
    if (!authElements || !authElements.authButtons || !authElements.userInfo || !authElements.welcomeUser || !authElements.userPointsDisplay) {
        console.log('UI元素尚未准备好，稍后再试');
        setTimeout(updateUIForLoggedInUser, 100);
        return;
    }
    
    authElements.authButtons.style.display = 'none';
    authElements.userInfo.style.display = 'flex';
    
    // 安全地设置用户名
    if (window.currentUser) {
        authElements.welcomeUser.textContent = `欢迎，${window.currentUser.username || window.currentUser.email || '用户'}`;
    } else {
        authElements.welcomeUser.textContent = '欢迎，用户';
    }
    
    // 使用正确的元素ID
    if (authElements.userPointsDisplay) {
        authElements.userPointsDisplay.textContent = `积分: ${window.userPoints || 0}`;
    }
}

// 更新未登录用户的UI
function updateUIForLoggedOutUser() {
    authElements.authButtons.style.display = 'flex';
    authElements.userInfo.style.display = 'none';
    window.currentUser = null;
    window.userPoints = 0;
}

// 登录
async function login() {
    const username = authElements.loginUsername.value.trim();
    const password = authElements.loginPassword.value;
    
    if (!username || !password) {
        showMessage(authElements.loginMessage, '请填写用户名和密码', 'error');
        return;
    }
    
    try {
        // 使用邮箱登录，这里简化处理，将用户名作为邮箱
        const email = `${username}@example.com`;
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        window.currentUser = data.user;
        await getUserProfile();
        
        authElements.loginModal.style.display = 'none';
        updateUIForLoggedInUser();
        showMessage(authElements.loginMessage, '', ''); // 清除消息
        
        // 清空输入框
        authElements.loginUsername.value = '';
        authElements.loginPassword.value = '';
    } catch (error) {
        showMessage(authElements.loginMessage, '登录失败: ' + error.message, 'error');
    }
}

// 注册
async function register() {
    const username = authElements.registerUsername.value.trim();
    const password = authElements.registerPassword.value;
    const confirmPassword = authElements.confirmPassword.value;
    
    if (!username || !password) {
        showMessage(authElements.registerMessage, '请填写用户名和密码', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage(authElements.registerMessage, '两次输入的密码不一致', 'error');
        return;
    }
    
    try {
        // 使用邮箱注册，这里简化处理，将用户名作为邮箱
        const email = `${username}@example.com`;
        
        // 1. 创建用户
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            // 处理用户已存在的情况
            if (error.message.includes('already registered')) {
                showMessage(authElements.registerMessage, '注册失败: 用户已存在', 'error');
                return;
            }
            throw error;
        }
        
        window.currentUser = data.user;
        
        // 2. 创建用户资料并设置初始积分
        // 先检查profiles表是否存在
        const { error: tableCheckError } = await supabaseClient
            .from('profiles')
            .select('*')
            .limit(1);
            
        // 如果表不存在，会返回错误
        if (tableCheckError && tableCheckError.code === '42P01') {
            console.error('profiles表不存在，请在Supabase中创建此表');
            alert('系统错误：用户积分表未创建，请联系管理员');
            throw new Error('profiles表不存在');
        }
        
        // 首先检查用户资料是否已存在
        const { data: existingProfile, error: checkError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .single();
            
        if (!checkError && existingProfile) {
            console.log('用户资料已存在，无需重新创建');
            window.userPoints = existingProfile.points || 10;
        } else {
            try {
                // 使用RPC函数绕过RLS限制
                // 注意：您需要在Supabase中创建此函数
                const { error: profileError } = await supabaseClient
                    .rpc('create_user_profile', { 
                        user_id: window.currentUser.id,
                        user_name: username,
                        initial_points: 10
                    });
                
                if (profileError) {
                    throw profileError;
                }
            } catch (profileError) {
                // 如果RPC调用失败，尝试直接插入（需要在Supabase中禁用profiles表的RLS或添加适当的策略）
                console.log('尝试直接插入用户资料...');
                
                // 使用upsert操作而不是insert，这样如果记录已存在则会更新
                const { error: directInsertError } = await supabaseClient
                    .from('profiles')
                    .upsert([
                        { 
                            id: window.currentUser.id, 
                            username: username, 
                            points: 10 // 初始积分
                        }
                    ], { onConflict: 'id' });
                
                if (directInsertError) {
                    console.error('创建用户资料错误:', directInsertError);
                    
                    // 如果是RLS错误，提供更明确的提示
                    if (directInsertError.code === '42501') {
                        alert('注册成功，但创建用户资料失败：需要在Supabase中配置profiles表的RLS权限。\n\n请联系管理员解决此问题。');
                        console.error('RLS权限错误 - 请在Supabase中为profiles表配置以下RLS策略：\n' +
                                    '1. 启用RLS\n' +
                                    '2. 添加策略: (auth.uid() = id) 用于SELECT, INSERT, UPDATE\n' +
                                    '或者创建create_user_profile函数');
                    } else if (directInsertError.code === '23505') {
                        // 如果是重复键错误，可能是用户资料已存在，尝试获取现有资料
                        console.log('用户资料可能已存在，尝试获取现有资料');
                        const { data: profile } = await supabaseClient
                            .from('profiles')
                            .select('points')
                            .eq('id', window.currentUser.id)
                            .single();
                            
                        if (profile) {
                            window.userPoints = profile.points || 10;
                        }
                    } else {
                        throw directInsertError;
                    }
                }
            }
        }
        
        console.log('用户积分初始化成功：10积分');
        
        window.userPoints = 10;
        
        // 先显示欢迎消息
        alert('注册成功！已赠送10积分作为新用户福利。');
        
        // 关闭弹框并更新UI
        authElements.registerModal.style.display = 'none';
        updateUIForLoggedInUser();
        showMessage(authElements.registerMessage, '', ''); // 清除消息
        
        // 清空输入框
        authElements.registerUsername.value = '';
        authElements.registerPassword.value = '';
        authElements.confirmPassword.value = '';
    } catch (error) {
        showMessage(authElements.registerMessage, '注册失败: ' + error.message, 'error');
    }
}

// 退出登录
async function logout() {
    try {
        // 添加超时处理
        const logoutPromise = supabaseClient.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('登出请求超时')), 3000)
        );
        
        // 使用Promise.race处理可能的超时
        const { error } = await Promise.race([logoutPromise, timeoutPromise])
            .catch(err => {
                console.warn('登出请求未完成，但继续处理:', err.message);
                return { error: null }; // 即使请求中断也继续处理
            });
            
        if (error) {
            console.warn('登出API返回错误，但继续处理:', error.message);
        }
        
        // 无论API请求成功与否，都更新UI状态
        window.currentUser = null;
        localStorage.removeItem('supabase.auth.token');
        updateUIForLoggedOutUser();
        console.log('用户界面已更新为登出状态');
    } catch (error) {
        console.error('退出登录错误:', error.message);
        // 即使出错也尝试更新UI
        updateUIForLoggedOutUser();
    }
}

// 更新积分
async function updatePoints(pointsToAdd) {
    if (!currentUser) return false;
    
    try {
        // 获取当前积分
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('points')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        const newPoints = data.points + pointsToAdd;
        
        // 更新积分
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        userPoints = newPoints;
        authElements.userPoints.textContent = `积分: ${userPoints}`;
        
        return true;
    } catch (error) {
        console.error('更新积分错误:', error.message);
        return false;
    }
}

// 显示消息
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = 'message';
    if (type) {
        element.classList.add(type);
    }
}

// 导出函数和变量
window.auth = {
    initAuth,
    isLoggedIn: () => !!currentUser,
    getCurrentUser: () => currentUser,
    getUserPoints: () => userPoints,
    updatePoints
};