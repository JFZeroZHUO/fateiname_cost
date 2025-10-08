// 测试环境变量和支付创建
document.addEventListener('DOMContentLoaded', async function() {
    const testBtn = document.getElementById('testBtn');
    const resultDiv = document.getElementById('result');
    
    testBtn.addEventListener('click', async () => {
        try {
            resultDiv.innerHTML = '<p>正在测试环境变量和支付创建...</p>';
            
            // 获取会话
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                resultDiv.innerHTML += '<p class="error">请先登录后再测试</p>';
                return;
            }
            
            // 测试支付创建API
            const response = await fetch('https://dbxjjbegydyudxqzfips.supabase.co/functions/v1/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabase.supabaseKey
                },
                body: JSON.stringify({
                    amount: 0.01,
                    points: 10,
                    productName: '测试环境变量',
                    user_id: session.user.id
                })
            });
            
            const responseText = await response.text();
            
            resultDiv.innerHTML += `<p>状态码: ${response.status}</p>`;
            resultDiv.innerHTML += `<p>响应内容:</p><pre>${responseText}</pre>`;
            
            try {
                // 尝试解析JSON
                const jsonData = JSON.parse(responseText);
                
                if (jsonData.error) {
                    resultDiv.innerHTML += `<p class="error">错误: ${jsonData.error}</p>`;
                } else if (jsonData.params) {
                    resultDiv.innerHTML += '<p class="success">支付参数正常返回</p>';
                    resultDiv.innerHTML += `<p>支付URL: ${jsonData.payment_url}</p>`;
                    resultDiv.innerHTML += '<p>支付参数:</p>';
                    resultDiv.innerHTML += `<pre>${JSON.stringify(jsonData.params, null, 2)}</pre>`;
                } else {
                    resultDiv.innerHTML += '<p class="warning">返回数据格式异常</p>';
                }
            } catch (e) {
                resultDiv.innerHTML += `<p class="error">响应不是有效的JSON: ${e.message}</p>`;
            }
            
        } catch (error) {
            resultDiv.innerHTML += `<p class="error">测试失败: ${error.message}</p>`;
            console.error('测试失败:', error);
        }
    });
});