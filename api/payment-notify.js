// api/payment-notify.js
export default async function handler(req, res) {
  try {
    // 转发支付平台的回调请求到你的实际服务器
    const response = await fetch('https://penally-pickier-anson.ngrok-free.dev/api/payment-notify', {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    // 返回你的服务器的响应给支付平台
    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (error) {
    console.error('支付回调处理失败:', error);
    // 返回成功响应给支付平台，避免重复通知
    // 实际业务中应根据支付平台的要求返回特定格式
    return res.status(200).send('success');
  }
}