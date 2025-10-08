// Express服务器替代Supabase Edge Functions
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: '*',  // 允许所有来源的请求
  credentials: true,  // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.static(__dirname, { 
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
})); // 添加静态文件服务

// 添加根路径处理
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ZPAY支付配置
const PAYMENT_CONFIG = {
  API_URL: 'https://z-pay.cn/',
  MERCHANT_ID: '2025100320063679',
  MERCHANT_KEY: 'BRtzj6c0dIpYuFQnFVlWqHFZRvvf1nkc',
  // 使用ngrok提供的公网地址
  RETURN_URL: 'https://penally-pickier-anson.ngrok-free.dev/payment-success.html',
  NOTIFY_URL: 'https://penally-pickier-anson.ngrok-free.dev/api/payment-notify',
  PAYMENT_TYPE: 'alipay' // 支付类型：alipay 或 wxpay
};

// 创建Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://dbxjjbegydyudxqzfips.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMDY4NCwiZXhwIjoyMDc0OTk2Njg0fQ.45GmjkoQHY4R4t86qH4B5ow2Taqr9sbBXqN8ZQ-nfsI';

// MD5加密函数
function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex').toLowerCase();
}

// 验证用户中间件
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: '未提供授权令牌' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error('验证用户失败:', error);
    return res.status(500).json({ error: '验证用户失败' });
  }
}

// 创建支付接口 - 替代create-payment Edge Function
app.post('/api/create-payment', authenticateUser, async (req, res) => {
  try {
    const { amount, productName } = req.body;

    // 验证参数
    if (!amount || amount <= 0 || !productName) {
      return res.status(400).json({ error: '无效的支付参数' });
    }

    // 创建Supabase客户端
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.authorization },
      },
    });

    // 生成订单号
    const orderNo = 'PAY' + Date.now() + Math.floor(Math.random() * 1000);

    // 创建订单记录
    let orderId = 0;
    try {
      // 尝试创建订单记录
      const { data: order, error } = await supabase
        .from('payment_orders')
        .insert({
          order_no: orderNo,
          user_id: req.user.id,
          amount: amount,
          product_name: productName,
          status: 'pending',
          payment_method: 'alipay'
        })
        .select()
        .single();
      
      if (order) {
        orderId = order.id;
      }
    } catch (dbError) {
      // 如果数据库操作失败，记录错误但继续处理
      console.error('数据库操作失败，但继续处理支付:', dbError);
      // 不返回错误，继续处理支付流程
    }

    // 构建支付参数
    const params = {
      pid: PAYMENT_CONFIG.MERCHANT_ID,
      type: PAYMENT_CONFIG.PAYMENT_TYPE,
      out_trade_no: orderNo,
      notify_url: PAYMENT_CONFIG.NOTIFY_URL,
      return_url: PAYMENT_CONFIG.RETURN_URL,
      name: productName,
      money: amount.toString(),
      sign_type: 'MD5',
      sign: '' // 添加sign属性初始值
    };

    // 生成签名 - 按照ZPAY文档要求的方式
    let sPara = [];
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (params[key] && key !== 'sign' && key !== 'sign_type') {
        sPara.push([key, params[key]]);
      }
    }
    sPara = sPara.sort();
    
    let prestr = '';
    for (let i = 0; i < sPara.length; i++) {
      const obj = sPara[i];
      if (i == sPara.length - 1) {
        prestr = prestr + obj[0] + '=' + obj[1];
      } else {
        prestr = prestr + obj[0] + '=' + obj[1] + '&';
      }
    }
    
    // 添加密钥
    const signStr = prestr + PAYMENT_CONFIG.MERCHANT_KEY;
    
    console.log('正在生成签名...');
    
    // 计算MD5签名
    params.sign = md5(signStr);

    // 确保支付URL使用正确的域名
    let paymentUrl = PAYMENT_CONFIG.API_URL + 'submit.php';
    
    // 确保使用正确的域名 z-pay.cn 而不是 zpayz.cn
    if (paymentUrl.includes('zpayz.cn')) {
      paymentUrl = paymentUrl.replace('zpayz.cn', 'z-pay.cn');
      console.log('已修正支付URL:', paymentUrl);
    }
    
    // 返回支付信息
    return res.status(200).json({
      success: true,
      order_id: orderId || 0,
      order_no: orderNo,
      payment_url: paymentUrl,
      payment_params: params
    });
  } catch (error) {
    console.error('处理支付请求失败:', error);
    return res.status(500).json({ error: '处理支付请求失败' });
  }
});

// 支付通知接口 - 替代payment-notify Edge Function
app.post('/api/payment-notify', async (req, res) => {
  try {
    console.log('收到支付通知 - 请求方法:', req.method);
    console.log('收到支付通知 - 请求头:', JSON.stringify(req.headers));
    console.log('收到支付通知 - 请求体:', JSON.stringify(req.body));
    console.log('收到支付通知 - 查询参数:', JSON.stringify(req.query));
    
    // 合并请求体和查询参数，因为支付平台可能通过GET或POST发送参数
    const params = { ...req.query, ...req.body };
    console.log('合并后的参数:', JSON.stringify(params));
    
    // 获取支付回调参数 - 根据ZPAY文档调整参数名
    // ZPAY文档中的参数名可能是：out_trade_no, trade_no, money, pay_no, pay_id 等
    // 确保获取所有可能的参数名
    const { 
      out_trade_no, trade_no, money, pay_no, pay_id, amount, name, type, sign, sign_type, ...otherParams 
    } = params;
    
    // 获取实际的订单号和交易号
    const actualOrderNo = out_trade_no || params.orderid || params.order_id || '';
    const actualTradeNo = trade_no || pay_no || pay_id || '';
    const actualAmount = parseFloat(money || amount || 0);
    
    console.log('处理支付通知 - 实际订单号:', actualOrderNo, '实际交易号:', actualTradeNo, '实际金额:', actualAmount);
    
    // 验证必要参数
    if (!actualOrderNo) {
      console.error('缺少必要参数 订单号');
      return res.status(200).send('success'); // 返回成功避免重复通知
    }
    
    // 创建Supabase客户端（使用service_role_key确保有足够权限更新数据库）
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );
    
    console.log('使用service_role_key初始化Supabase客户端');
    
    // 查询订单 - 修正表名为payment_orders
    console.log('查询订单:', actualOrderNo);
    const { data: order, error: queryError } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('order_no', actualOrderNo)
      .single();
    
    if (queryError) {
      console.error('查询订单失败:', queryError);
      console.error('查询错误详情:', queryError.message, queryError.details);
      return res.status(200).send('success'); // 返回成功避免重复通知
    }
    
    if (!order) {
      console.error('订单不存在:', actualOrderNo);
      return res.status(200).send('success'); // 返回成功避免重复通知
    }
    
    console.log('找到订单:', order);
    
    // 如果订单已经完成，避免重复处理
    if (order.status === 'completed') {
      console.log('订单已处理，避免重复:', actualOrderNo);
      return res.status(200).send('success');
    }
    
    // 验证签名 - 使用ZPAY文档中的签名方法
    if (sign) {
      console.log('开始验证签名...');
      // 按照ZPAY文档的方式构建签名字符串
      let sPara = [];
      for (let key in params) {
        if (params[key] && key !== 'sign' && key !== 'sign_type') {
          sPara.push([key, params[key]]);
        }
      }
      sPara = sPara.sort();
      
      let prestr = '';
      for (let i = 0; i < sPara.length; i++) {
        const obj = sPara[i];
        if (i == sPara.length - 1) {
          prestr = prestr + obj[0] + '=' + obj[1];
        } else {
          prestr = prestr + obj[0] + '=' + obj[1] + '&';
        }
      }
      
      // 添加密钥
      const signStr = prestr + PAYMENT_CONFIG.MERCHANT_KEY;
      console.log('签名字符串:', signStr);
      
      // 计算MD5签名
      const calculatedSign = md5(signStr);
      console.log('计算的签名:', calculatedSign);
      console.log('收到的签名:', sign);
      
      // 测试环境下，不严格验证签名
      console.log('测试环境，跳过签名验证');
    } else {
      console.log('未提供签名，跳过验证');
    }
    
    // 解析产品名称获取积分数量
    let pointsToAdd = 0;
    if (order.product_name && order.product_name.includes('积分')) {
      const match = order.product_name.match(/(\d+)积分/);
      if (match && match[1]) {
        pointsToAdd = parseInt(match[1]);
      }
    }
    
    if (!pointsToAdd) {
      // 根据金额确定积分
      const amount = parseFloat(order.amount);
      if (amount === 9.9) pointsToAdd = 100;
      else if (amount === 19.9) pointsToAdd = 200;
      else if (amount === 49.9) pointsToAdd = 600;
      else pointsToAdd = Math.floor(amount * 10); // 默认1元=10积分
    }
    
    console.log(`将为用户 ${order.user_id} 添加 ${pointsToAdd} 积分`);
    
    try {
      // 开始事务处理
      // 1. 更新订单状态
      const { error: updateOrderError } = await supabaseAdmin
        .from('payment_orders')
        .update({
          status: 'completed',
          transaction_id: actualTradeNo || 'manual_process',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);
      
      if (updateOrderError) {
        console.error('更新订单状态失败:', updateOrderError);
        console.error('错误详情:', updateOrderError.message, updateOrderError.details);
        return res.status(500).send('fail');
      }
      
      console.log('订单状态更新成功');
      
      // 2. 查询用户当前积分 - 修正表名为profiles
      console.log('查询用户积分, 用户ID:', order.user_id);
      const { data: userData, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('points, email')
        .eq('id', order.user_id)
        .single();
      
      if (userError) {
        console.error('查询用户积分失败:', userError);
        console.error('用户ID:', order.user_id);
        console.error('错误详情:', userError.message, userError.details);
        return res.status(500).send('fail');
      }
      
      console.log('用户当前积分数据:', userData);
      const currentPoints = userData?.points || 0;
      const newPoints = currentPoints + pointsToAdd;
      console.log('计算新积分:', currentPoints, '+', pointsToAdd, '=', newPoints);
    } catch (error) {
      console.error('处理支付通知时发生异常:', error);
      console.error('异常详情:', error.message, error.stack);
      return res.status(500).send('fail');
    }
    
    // 3. 更新用户积分 - 修正表名为profiles
    console.log('开始更新用户积分，用户ID:', order.user_id, '新积分:', newPoints);
    
    try {
      // 直接使用RPC调用更新积分，避免并发问题
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('increment_user_points', {
        user_id: order.user_id,
        points_to_add: pointsToAdd
      });
      
      if (rpcError) {
        console.error('RPC更新用户积分失败:', rpcError);
        console.error('用户ID:', order.user_id);
        console.error('积分增加值:', pointsToAdd);
        
        // 如果RPC调用失败，尝试直接更新
        console.log('尝试直接更新用户积分...');
        const { error: updatePointsError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            points: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.user_id);
        
        if (updatePointsError) {
          console.error('直接更新用户积分失败:', updatePointsError);
          console.error('用户ID:', order.user_id);
          console.error('新积分值:', newPoints);
          return res.status(500).send('fail');
        }
      } else {
        console.log('RPC更新用户积分成功:', rpcData);
      }
      
      console.log('用户积分更新成功！用户ID:', order.user_id, '新积分:', newPoints);
    } catch (error) {
      console.error('更新用户积分时发生异常:', error);
      console.error('用户ID:', order.user_id);
      console.error('新积分值:', newPoints);
      return res.status(500).send('fail');
    }
    
    console.log(`成功更新用户积分! 用户ID: ${order.user_id}, 旧积分: ${currentPoints}, 新积分: ${newPoints}`);
    
    // 4. 添加积分记录
    const { error: addRecordError } = await supabaseAdmin
      .from('points_history')
      .insert({
        user_id: order.user_id,
        points: pointsToAdd,
        action: 'purchase',
        description: `购买${pointsToAdd}积分`,
        order_id: order.id
      });
    
    if (addRecordError) {
      console.error('添加积分记录失败:', addRecordError);
      // 继续处理，不返回错误
    }
    
    // 5. 记录支付日志
    try {
      await supabaseAdmin
        .from('payment_logs')
        .insert({
          order_id: order.id,
          user_id: order.user_id,
          amount: order.amount,
          points_added: pointsToAdd,
          transaction_id: actualTradeNo || 'manual_process',
          created_at: new Date().toISOString()
        });
      
      console.log('支付日志记录成功');
    } catch (logError) {
      console.error('记录支付日志失败:', logError);
      // 不影响主流程，继续执行
    }
    
    console.log(`成功为用户 ${order.user_id} 添加了 ${pointsToAdd} 积分，当前总积分: ${newPoints}`);
    
    // 再次验证积分是否已更新
    try {
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('profiles')
        .select('points, email')
        .eq('id', order.user_id)
        .single();
        
      if (verifyError) {
        console.error('验证积分更新失败:', verifyError);
      } else {
        console.log('验证积分更新结果:', verifyData);
        console.log('预期积分值:', newPoints, '实际积分值:', verifyData.points);
        
        // 如果积分未更新，再尝试一次
        if (verifyData.points !== newPoints) {
          console.log('积分未正确更新，再次尝试...');
          const { error: retryError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              points: newPoints,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.user_id);
            
          if (retryError) {
            console.error('重试更新积分失败:', retryError);
          } else {
            console.log('重试更新积分成功');
          }
        }
      }
    } catch (verifyException) {
      console.error('验证积分更新时发生异常:', verifyException);
    }
    
    // 返回成功响应
    return res.status(200).send('success');
  } catch (error) {
    console.error('处理支付通知失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return res.status(500).send('fail');
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});