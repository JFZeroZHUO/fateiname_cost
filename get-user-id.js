// 获取用户ID
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 创建Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://dbxjjbegydyudxqzfips.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMDY4NCwiZXhwIjoyMDc0OTk2Njg0fQ.45GmjkoQHY4R4t86qH4B5ow2Taqr9sbBXqN8ZQ-nfsI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getUsers() {
  try {
    // 获取用户列表
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(5);
    
    if (error) {
      console.error('获取用户列表失败:', error);
      return;
    }
    
    console.log('用户列表:');
    data.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email || 'N/A'}`);
    });
  } catch (error) {
    console.error('获取用户列表时发生错误:', error);
  }
}

// 运行函数
getUsers();