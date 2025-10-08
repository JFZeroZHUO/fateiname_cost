// 模拟支付成功的脚本
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 初始化Supabase客户端 - 使用service_role_key以确保有足够权限
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 模拟支付成功并更新用户积分
async function simulatePayment(userId, amount = 10) {
  try {
    console.log(`开始模拟支付流程，用户ID: ${userId}, 金额: ${amount}元`);
    
    // 1. 创建订单记录
    const orderData = {
      user_id: userId,
      amount: amount,
      status: 'pending',
      product_name: `${amount}元充值`,
      created_at: new Date().toISOString(),
      order_no: `SIM${Date.now()}`,
      payment_method: 'alipay'
    };
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('payment_orders')
      .insert(orderData)
      .select()
      .single();
      
    if (orderError) {
      console.error('创建订单失败:', orderError);
      return { success: false, error: orderError };
    }
    
    console.log('订单创建成功:', order);
    
    // 2. 获取用户当前积分
    const { data: userData, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('获取用户信息失败:', userError);
      return { success: false, error: userError };
    }
    
    const currentPoints = userData.points || 0;
    console.log('当前用户积分:', currentPoints, '用户ID:', userId);
    
    // 3. 计算要添加的积分 (1元 = 10积分)
    const pointsToAdd = Math.floor(parseFloat(amount) * 10);
    const newPoints = currentPoints + pointsToAdd;
    
    console.log(`将为用户添加 ${pointsToAdd} 积分，新积分将为: ${newPoints}`);
    
    // 4. 更新订单状态为已完成
    const { error: updateOrderError } = await supabaseAdmin
      .from('payment_orders')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', order.id);
      
    if (updateOrderError) {
      console.error('更新订单状态失败:', updateOrderError);
      return { success: false, error: updateOrderError };
    }
    
    // 5. 直接更新用户积分
    console.log('直接更新用户积分...');
    
    const { error: updatePointsError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        points: newPoints
      })
      .eq('id', userId);
    
    if (updatePointsError) {
      console.error('更新用户积分失败:', updatePointsError);
      return { success: false, error: updatePointsError };
    }
    
    console.log('用户积分更新成功!');
    
    // 6. 记录支付日志
    await supabaseAdmin
      .from('payment_logs')
      .insert({
        order_id: order.id,
        user_id: userId,
        amount: amount,
        points_added: pointsToAdd,
        transaction_id: 'simulated_payment',
        created_at: new Date().toISOString()
      });
    
    // 7. 验证积分是否已更新
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
      
    if (verifyError) {
      console.error('验证积分更新失败:', verifyError);
      return { success: true, warning: '无法验证积分更新' };
    }
    
    console.log('验证积分更新结果:', verifyData);
    console.log('预期积分值:', newPoints, '实际积分值:', verifyData.points);
    
    // 如果积分未更新，再尝试一次
    if (verifyData.points !== newPoints) {
      console.log('积分未正确更新，再次尝试...');
      await supabaseAdmin
        .from('profiles')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      return { 
        success: true, 
        warning: '积分更新需要重试',
        expected: newPoints,
        actual: verifyData.points
      };
    }
    
    return { 
      success: true, 
      previousPoints: currentPoints,
      pointsAdded: pointsToAdd,
      newPoints: verifyData.points
    };
  } catch (error) {
    console.error('模拟支付过程中发生错误:', error);
    return { success: false, error };
  }
}

// 如果直接运行此脚本，则执行模拟支付
if (require.main === module) {
  // 检查命令行参数
  const userId = process.argv[2];
  const amount = process.argv[3] || 10;
  
  if (!userId) {
    console.error('请提供用户ID作为参数');
    console.log('用法: node simulate-payment.js <用户ID> [金额]');
    process.exit(1);
  }
  
  simulatePayment(userId, amount)
    .then(result => {
      console.log('模拟支付结果:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('模拟支付失败:', error);
      process.exit(1);
    });
} else {
  // 导出函数以便其他模块使用
  module.exports = { simulatePayment };
}