// supabase/functions/create-payment/index.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts'

// ZPAY支付配置
const PAYMENT_CONFIG = {
  API_URL: 'https://z-pay.cn/',
  MERCHANT_ID: '2025100320063679',
  MERCHANT_KEY: 'BRtzj6c0dIpYuFQnFVlWqHFZRvvf1nkc',
  RETURN_URL: 'http://localhost:8000/payment-success.html',
  NOTIFY_URL: 'http://localhost:8000/payment-notify',
  PAYMENT_TYPE: 'alipay' // 支付类型：alipay 或 wxpay
}

// MD5加密函数
function md5(data) {
  return createHash('md5').update(data).digest('hex').toLowerCase()
}

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建Supabase客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 获取当前用户
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // 解析请求数据
    const { amount, productName } = await req.json()

    // 验证参数
    if (!amount || amount <= 0 || !productName) {
      return new Response(
        JSON.stringify({ error: '无效的支付参数' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 生成订单号
    const orderNo = 'PAY' + Date.now() + Math.floor(Math.random() * 1000)

    // 创建订单记录 - 跳过数据库存储，直接处理支付
    let orderId = 0;
    try {
      // 尝试创建订单记录
      const { data: order, error } = await supabaseClient
        .from('payment_orders')
        .insert({
          order_no: orderNo,
          user_id: user.id,
          amount: amount,
          product_name: productName,
          status: 'pending',
          payment_method: 'alipay'
        })
        .select()
        .single()
      
      if (order) {
        orderId = order.id;
      }
    } catch (dbError) {
      // 如果数据库操作失败，记录错误但继续处理
      console.error('数据库操作失败，但继续处理支付:', dbError)
      // 不返回错误，继续处理支付流程
    }

    // 构建支付参数
    const params: {[key: string]: string} = {
      pid: PAYMENT_CONFIG.MERCHANT_ID,
      type: PAYMENT_CONFIG.PAYMENT_TYPE, // 使用配置中的支付类型
      out_trade_no: orderNo,
      notify_url: PAYMENT_CONFIG.NOTIFY_URL,
      return_url: PAYMENT_CONFIG.RETURN_URL,
      name: productName,
      money: amount.toString(),
      sign_type: 'MD5',
      sign: '' // 添加sign属性初始值
    }

    // 生成签名 - 按照ZPAY文档要求的方式
    let sPara = []
    const keys = Object.keys(params)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (params[key] && key !== 'sign' && key !== 'sign_type') {
        sPara.push([key, params[key]])
      }
    }
    sPara = sPara.sort()
    
    let prestr = ''
    for (let i = 0; i < sPara.length; i++) {
      const obj = sPara[i]
      if (i == sPara.length - 1) {
        prestr = prestr + obj[0] + '=' + obj[1]
      } else {
        prestr = prestr + obj[0] + '=' + obj[1] + '&'
      }
    }
    
    // 添加密钥
    const signStr = prestr + PAYMENT_CONFIG.MERCHANT_KEY
    
    console.log('正在生成签名...')
    
    // 计算MD5签名
    params.sign = md5(signStr)

    // 确保支付URL使用正确的域名
    let paymentUrl = PAYMENT_CONFIG.API_URL + 'submit.php';
    
    // 确保使用正确的域名 z-pay.cn 而不是 zpayz.cn
    if (paymentUrl.includes('zpayz.cn')) {
      paymentUrl = paymentUrl.replace('zpayz.cn', 'z-pay.cn');
      console.log('已修正支付URL:', paymentUrl);
    }
    
    // 返回支付信息
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId || 0,
        order_no: orderNo,
        payment_url: paymentUrl,
        payment_params: params
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('处理支付请求失败:', error)
    return new Response(
      JSON.stringify({ error: '处理支付请求失败' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})