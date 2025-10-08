// 前端调用 Supabase Edge Function 的示例代码

// 获取当前用户的会话令牌
async function callAdminFunction(action, data = {}) {
  try {
    // 从 API 配置中获取 Supabase 客户端
    const supabase = window.API_CONFIG.SUPABASE.client;
    
    // 获取当前会话
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('用户未登录');
    }
    
    // 获取访问令牌
    const token = session.access_token;
    
    // 使用实际的 Edge Function URL
    const functionUrl = 'https://dbxjjbegydyudxqzfips.supabase.co/functions/v1/admin';
    
    // 发送请求到 Edge Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action,
        data
      })
    });
    
    // 解析响应
    const result = await response.json();
    
    // 检查是否有错误
    if (!response.ok) {
      throw new Error(result.error || '请求失败');
    }
    
    return result;
  } catch (error) {
    console.error('调用管理 API 失败:', error);
    throw error;
  }
}

// 使用示例

// 1. 获取所有用户列表 (仅管理员可用)
async function listAllUsers() {
  try {
    const result = await callAdminFunction('listUsers');
    console.log('所有用户:', result.users);
    return result.users;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    alert('获取用户列表失败: ' + error.message);
  }
}

// 2. 删除用户 (仅管理员可用)
async function deleteUser(userId) {
  try {
    const result = await callAdminFunction('deleteUser', { userId });
    console.log('删除用户结果:', result);
    alert('用户已成功删除');
    return result;
  } catch (error) {
    console.error('删除用户失败:', error);
    alert('删除用户失败: ' + error.message);
  }
}

// 3. 更新用户角色 (仅管理员可用)
async function updateUserRole(userId, isAdmin) {
  try {
    const result = await callAdminFunction('updateUserRole', { userId, isAdmin });
    console.log('更新用户角色结果:', result);
    alert(`用户角色已更新为${isAdmin ? '管理员' : '普通用户'}`);
    return result;
  } catch (error) {
    console.error('更新用户角色失败:', error);
    alert('更新用户角色失败: ' + error.message);
  }
}

// 导出函数供其他模块使用
window.adminAPI = {
  listAllUsers,
  deleteUser,
  updateUserRole
};