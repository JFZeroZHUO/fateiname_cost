// supabase/functions/payment-notify/index.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts'

// ZPAY支付配置
const PAYMENT_CONFIG = {
  MERCHANT_ID: '2025100320063679',
  MERCHANT_KEY: 'BRtzj6c0dIpYuFQnFVlWqHFZRvvf1nkc',
}

// MD5加密函数
function md5(data) {
  return createHash('md5').update(data).digest('hex')
}

serve(async (req) => {
  try {
    // 获取通知数据
    const formData = await req.formData()
    const notifyData = {}
    
    // 将formData转换为对象
    for (const [key, value] of formData.entries()) {
      notifyData[key] = value
    }
    
    console.log('收到支付通知:', notifyData)
    
    // 验证必要参数
    const { pid, trade_no, out_trade_no, type, money, name, trade_status, sign } = notifyData
    
    if (!pid || !trade_no || !out_trade_no || !type || !money || !trade_status || !sign) {
      console.error('通知参数不完整')
      return new Response('fail', { status: 400 })
    }
    
    // 验证商户ID
    if (pid !== PAYMENT_CONFIG.MERCHANT_ID) {
      console.error('商户ID不匹配')
      return new Response('fail', { status: 400 })
    }
    
    // 验证签名
    let signStr = ''
    const sortedKeys = Object.keys(notifyData).sort()
    
    for (const key of sortedKeys) {
      if (notifyData[key] && key !== 'sign' && key !== 'sign_type') {
        signStr += key + '=' + notifyData[key] + '&'
      }
    }
    
    signStr += 'key=' + PAYMENT_CONFIG.MERCHANT_KEY
    const calculatedSign = md5(signStr)
    
    if (calculatedSign !== sign) {
      console.error('签名验证失败')
      return new Response('fail', { status: 400 })
    }
    
    // 验证支付状态
    if (trade_status !== 'TRADE_SUCCESS') {
      console.log('支付未成功，状态:', trade_status)
      return new Response('success', { status: 200 }) // 返回成功避免重复通知
    }
    
    // 创建Supabase客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // 使用service_role密钥以绕过RLS
    )
    
    // 查询订单
    const { data: order, error: queryError } = await supabaseClient
      .from('payment_orders')
      .select('*')
      .eq('order_no', out_trade_no)
      .eq('status', 'pending')
      .single()
    
    if (queryError || !order) {
      console.error('订单不存在或状态不正确:', queryError)
      return new Response('success', { status: 200 }) // 返回成功避免重复通知
    }
    
    // 调用处理支付成功的函数
    const { error: processError } = await supabaseClient.rpc(
      'process_payment_success',
      {
        p_order_id: order.id,
        p_transaction_id: trade_no
      }
    )
    
    if (processError) {
      console.error('处理支付成功失败:', processError)
      return new Response('fail', { status: 500 })
    }
    
    // 返回成功
    return new Response('success', { status: 200 })
  } catch (error) {
    console.error('处理支付通知失败:', error)
    return new Response('fail', { status: 500 })
  }
})