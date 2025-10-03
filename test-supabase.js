// Supabase连接测试脚本
const supabaseUrl = 'https://dbxjjbegydyudxqzfips.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjA2ODQsImV4cCI6MjA3NDk5NjY4NH0.9ZkOGGwQC3q5KEqobIA9Vbbrz3-KJkXHVCruDYUgOig';

// 测试结果显示区域
const testResults = document.getElementById('testResults');

// 添加测试结果
function addResult(test, success, message) {
  const resultItem = document.createElement('div');
  resultItem.className = success ? 'success' : 'error';
  resultItem.innerHTML = `<strong>${test}:</strong> ${message}`;
  testResults.appendChild(resultItem);
}

// 测试Supabase连接
async function testConnection() {
  try {
    // 检查是否存在CORS问题
    addResult('CORS检测', 'pending', '正在检测CORS配置...');
    
    // 初始化Supabase客户端
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // 使用更简单的API调用测试连接
    const { data, error } = await supabase.auth.getSession();
    
    // 移除CORS检测结果
    testResults.removeChild(testResults.lastChild);
    
    if (error) {
      addResult('连接测试', false, `连接失败: ${error.message}`);
      console.error('Supabase连接错误:', error);
      return false;
    }
    
    // 检查控制台是否有网络错误
    const hasNetworkError = window.performance
      .getEntries()
      .some(entry => 
        entry.name && 
        entry.name.includes('supabase') && 
        entry.name.includes('profiles') && 
        entry.duration === 0
      );
    
    if (hasNetworkError) {
      addResult('连接测试', false, '检测到网络请求被中断 (net::ERR_ABORTED)，可能存在CORS问题');
      console.warn('检测到可能的CORS问题，请检查Supabase项目设置');
      return false;
    }
    
    addResult('连接测试', true, '成功连接到Supabase服务');
    return true;
  } catch (err) {
    addResult('连接测试', false, `发生错误: ${err.message}`);
    console.error('Supabase连接测试错误:', err);
    
    // 检查是否是CORS错误
    if (err instanceof DOMException && err.name === 'NetworkError') {
      addResult('CORS问题', false, '检测到CORS错误，请检查Supabase项目设置');
    }
    
    return false;
  }
}

// 测试认证功能
async function testAuth() {
  try {
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // 检查认证服务是否可用
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      addResult('认证服务测试', false, `认证服务不可用: ${error.message}`);
      return;
    }
    
    addResult('认证服务测试', true, '认证服务正常运行');
  } catch (err) {
    addResult('认证服务测试', false, `发生错误: ${err.message}`);
    console.error('认证服务测试错误:', err);
  }
}

// 测试数据库操作
async function testDatabase() {
  try {
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // 尝试查询profiles表
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      addResult('数据库测试', false, `数据库操作失败: ${error.message}`);
      return;
    }
    
    addResult('数据库测试', true, '数据库操作成功');
  } catch (err) {
    addResult('数据库测试', false, `发生错误: ${err.message}`);
    console.error('数据库测试错误:', err);
  }
}

// 运行所有测试
async function runAllTests() {
  testResults.innerHTML = ''; // 清空之前的测试结果
  
  // 首先测试连接
  const connectionSuccess = await testConnection();
  
  // 如果连接成功，继续测试其他功能
  if (connectionSuccess) {
    await testAuth();
    await testDatabase();
  }
}

// 页面加载完成后运行测试
document.addEventListener('DOMContentLoaded', function() {
  // 检查Supabase库是否加载
  if (window.supabase) {
    // 添加运行测试按钮事件
    document.getElementById('runTests').addEventListener('click', runAllTests);
  } else {
    testResults.innerHTML = '<div class="error"><strong>错误:</strong> Supabase库未加载</div>';
  }
});