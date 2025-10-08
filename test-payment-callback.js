// 测试支付回调和数据库更新
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 创建Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://dbxjjbegydyudxqzfips.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMDY4NCwiZXhwIjoyMDc0OTk2Njg0fQ.45GmjkoQHY4R4t86qH4B5ow2Taqr9sbBXqN8ZQ-nfsI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 测试用户ID - 使用正确的UUID格式
const TEST_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // 替换为实际用户ID

// 测试订单号
const TEST_ORDER_NO = 'test_order_' + Date.now();

// 测试金额
const TEST_AMOUNT = 19.9;

// 测试产品名称
const TEST_PRODUCT_NAME = '200积分';

// 步骤1: 创建测试订单
async function createTestOrder() {
  console.log('创建测试订单...');
  
  const { data, error } = await supabase
    .from('payment_orders')
    .insert({
      order_no: TEST_ORDER_NO,
      user_id: TEST_USER_ID,
      amount: TEST_AMOUNT,
      product_name: TEST_PRODUCT_NAME,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select();
  
  if (error) {
    console.error('创建测试订单失败:', error);
    return null;
  }
  
  console.log('测试订单创建成功:', data[0]);
  return data[0];
}

// 步骤2: 获取用户当前积分
async function getUserPoints(userId) {
  console.log(`获取用户 ${userId} 当前积分...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('获取用户积分失败:', error);
    return 0;
  }
  
  console.log('用户当前积分:', data.points || 0);
  return data.points || 0;
}

// 步骤3: 模拟支付回调处理
async function simulatePaymentCallback(order) {
  console.log('模拟支付回调处理...');
  
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
    if (order.amount === 9.9) pointsToAdd = 100;
    else if (order.amount === 19.9) pointsToAdd = 200;
    else if (order.amount === 49.9) pointsToAdd = 600;
    else pointsToAdd = Math.floor(order.amount * 10); // 默认1元=10积分
  }
  
  console.log(`将为用户 ${order.user_id} 添加 ${pointsToAdd} 积分`);
  
  try {
    // 1. 更新订单状态
    const { error: updateOrderError } = await supabase
      .from('payment_orders')
      .update({
        status: 'completed',
        transaction_id: 'test_transaction_' + Date.now(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);
    
    if (updateOrderError) {
      console.error('更新订单状态失败:', updateOrderError);
      return false;
    }
    
    console.log('订单状态更新成功');
    
    // 2. 查询用户当前积分
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', order.user_id)
      .single();
    
    if (userError) {
      console.error('查询用户积分失败:', userError);
      return false;
    }
    
    console.log('用户当前积分数据:', userData);
    const currentPoints = userData?.points || 0;
    const newPoints = currentPoints + pointsToAdd;
    
    // 3. 更新用户积分
    console.log('开始更新用户积分，用户ID:', order.user_id, '新积分:', newPoints);
    
    const { error: updatePointsError } = await supabase
      .from('profiles')
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.user_id);
    
    if (updatePointsError) {
      console.error('更新用户积分失败:', updatePointsError);
      return false;
    }
    
    console.log('用户积分更新成功！');
    
    // 4. 验证积分是否已更新
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', order.user_id)
      .single();
      
    if (verifyError) {
      console.error('验证积分更新失败:', verifyError);
    } else {
      console.log('验证积分更新结果:', verifyData);
      console.log('预期积分值:', newPoints, '实际积分值:', verifyData.points);
    }
    
    return true;
  } catch (error) {
    console.error('模拟支付回调处理时发生异常:', error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    // 获取用户初始积分
    const initialPoints = await getUserPoints(TEST_USER_ID);
    console.log('用户初始积分:', initialPoints);
    
    // 创建测试订单
    const order = await createTestOrder();
    if (!order) {
      console.error('测试失败: 无法创建测试订单');
      return;
    }
    
    // 模拟支付回调
    const success = await simulatePaymentCallback(order);
    if (!success) {
      console.error('测试失败: 模拟支付回调处理失败');
      return;
    }
    
    // 获取用户最终积分
    const finalPoints = await getUserPoints(TEST_USER_ID);
    console.log('用户最终积分:', finalPoints);
    console.log('积分变化:', finalPoints - initialPoints);
    
    console.log('测试完成!');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
main();