// api/create-payment.js
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 确保请求体正确解析
    let bodyData = req.body;
    
    // 如果req.body未定义或为空，手动解析请求体
    if (!bodyData || Object.keys(bodyData).length === 0) {
      bodyData = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk.toString() });
        req.on('end', () => { 
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            console.error('请求体解析失败:', e);
            resolve({});
          }
        });
      });
    }
    
    console.log('转发支付请求，数据:', JSON.stringify(bodyData));
    
    // 检查ngrok服务器连接状态
    try {
      // 转发请求到实际的支付API服务器，添加超时设置
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch('https://penally-pickier-anson.ngrok-free.dev/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error('支付请求超时');
        return res.status(504).json({ error: '支付服务器请求超时，请确认ngrok服务器是否正常运行' });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('支付创建失败:', error);
    return res.status(500).json({ 
      error: '支付服务器连接失败', 
      message: error.message,
      details: '请确认ngrok服务器是否正常运行'
    });
  }
}