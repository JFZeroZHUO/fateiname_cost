// 统一API配置文件
// 包含Supabase和ZPAY支付API的所有配置

// ===== Supabase配置 =====
const SUPABASE_CONFIG = {
    URL: 'https://dbxjjbegydyudxqzfips.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjA2ODQsImV4cCI6MjA3NDk5NjY4NH0.9ZkOGGwQC3q5KEqobIA9Vbbrz3-KJkXHVCruDYUgOig',
    SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMDY4NCwiZXhwIjoyMDc0OTk2Njg0fQ.45GmjkoQHY4R4t86qH4B5ow2Taqr9sbBXqN8ZQ-nfsI',
    
    // 初始化Supabase客户端
    initClient: function() {
        try {
            // 直接使用window.supabase.createClient方式初始化
            // 这是test-supabase.js中使用的方式，已经验证可行
            if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
                console.log('使用window.supabase.createClient初始化');
                window.supabaseClient = window.supabase.createClient(this.URL, this.KEY);
                console.log('Supabase客户端初始化成功');
                return window.supabaseClient;
            } else {
                console.warn('window.supabase不可用，尝试其他初始化方式');
                
                // 检查是否有全局createClient函数
                if (typeof createClient === 'function') {
                    console.log('使用全局createClient初始化');
                    window.supabaseClient = createClient(this.URL, this.KEY);
                    console.log('Supabase客户端初始化成功');
                    return window.supabaseClient;
                }
                
                // 如果无法初始化，创建一个模拟客户端
                console.warn('无法初始化Supabase，创建模拟客户端');
                window.supabaseClient = {
                    auth: {
                        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                        onAuthStateChange: (callback) => {
                            console.log('Auth状态监听已设置(模拟)');
                            return { data: { subscription: { unsubscribe: () => {} } } };
                        },
                        signOut: () => Promise.resolve({ error: null })
                    },
                    from: (table) => ({
                        select: () => ({ data: [], error: null }),
                        insert: () => ({ data: null, error: null }),
                        update: () => ({ data: null, error: null })
                    })
                };
                console.warn('创建了模拟的Supabase客户端');
                return window.supabaseClient;
            }
        } catch (error) {
            console.error('Supabase客户端初始化失败:', error);
            // 创建一个基本的客户端对象以避免null错误
            window.supabaseClient = {
                auth: {
                    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                    signOut: () => Promise.resolve({ error: null })
                }
            };
            return window.supabaseClient;
        }
    },
    
    // 初始化具有管理员权限的Supabase客户端（仅在服务器端使用）
    initAdminClient: function() {
        if (window.supabase) {
            // 警告：此客户端具有完全数据库访问权限，不应在前端使用
            console.warn('警告：SERVICE_ROLE_KEY具有完全数据库访问权限，不应在前端使用！');
            return supabase.createClient(this.URL, this.SERVICE_ROLE_KEY);
        } else {
            console.error('Supabase库未加载，请确保在HTML中引入了Supabase JS库');
            return null;
        }
    }
};

// ===== ZPAY支付API配置 =====
const PAYMENT_CONFIG = {
    // API信息（兼容易支付接口）
    API_URL: 'https://zpayz.cn/',
    MERCHANT_ID: '2025100320063679',  // 商户ID（PID）
    MERCHANT_KEY: 'BRtzj6c0dIpYuFQnFVlWqHFZRvvf1nkc',  // 商户密钥（PKEY）
    
    // 支付相关配置
    RETURN_URL: window.location.origin + '/payment-success.html',  // 支付成功后的跳转地址
    NOTIFY_URL: window.location.origin + '/payment-notify',  // 异步通知地址
    
    // 创建支付订单
    createOrder: function(orderInfo) {
        const { amount, orderNo, productName } = orderInfo;
        
        // 构建支付参数
        const params = {
            pid: this.MERCHANT_ID,
            type: 'alipay',  // 支付方式，可选：alipay（支付宝）, wxpay（微信）
            out_trade_no: orderNo,
            notify_url: this.NOTIFY_URL,
            return_url: this.RETURN_URL,
            name: productName,
            money: amount,
            sign_type: 'MD5'
        };
        
        // 生成签名
        let signStr = '';
        Object.keys(params).sort().forEach(key => {
            if (params[key] && key !== 'sign' && key !== 'sign_type') {
                signStr += key + '=' + params[key] + '&';
            }
        });
        signStr += 'key=' + this.MERCHANT_KEY;
        
        // 计算MD5签名
        params.sign = this.md5(signStr);
        
        return {
            url: this.API_URL + 'submit.php',
            params: params
        };
    },
    
    // 简单的MD5实现（实际项目中应使用成熟的加密库）
    md5: function(string) {
        // 注意：这里需要引入实际的MD5库
        // 在实际项目中，请使用crypto-js或其他MD5库
        console.log('需要实现MD5加密，请引入相关库');
        return string; // 这里仅作为占位符，实际使用时需要替换为真正的MD5实现
    },
    
    // 验证支付回调
    verifyCallback: function(params) {
        // 验证签名
        const receivedSign = params.sign;
        delete params.sign;
        delete params.sign_type;
        
        let signStr = '';
        Object.keys(params).sort().forEach(key => {
            if (params[key]) {
                signStr += key + '=' + params[key] + '&';
            }
        });
        signStr += 'key=' + this.MERCHANT_KEY;
        
        const calculatedSign = this.md5(signStr);
        return receivedSign === calculatedSign;
    }
};

// 导出所有配置
window.API_CONFIG = {
    SUPABASE: SUPABASE_CONFIG,
    PAYMENT: PAYMENT_CONFIG,
    
    // 初始化所有API
    init: function() {
        // 初始化Supabase
        this.SUPABASE.initClient();
        
        console.log('API配置已初始化');
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', function() {
    window.API_CONFIG.init();
});