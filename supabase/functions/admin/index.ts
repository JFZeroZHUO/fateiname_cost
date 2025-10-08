// 这是一个 Supabase Edge Function 示例
// 在实际部署时，这个文件会运行在 Deno 环境中

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// 处理请求的主函数
Deno.serve(async (req) => {
  try {
    // CORS 头设置
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      })
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: '只允许 POST 请求' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // 获取请求体
    const { action, data } = await req.json()

    // 验证用户身份 - 从请求头中获取 JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // 使用实际的 Supabase URL 和 SERVICE_ROLE_KEY
    const supabaseUrl = 'https://dbxjjbegydyudxqzfips.supabase.co'
    const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieGpqYmVneWR5dWR4cXpmaXBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMDY4NCwiZXhwIjoyMDc0OTk2Njg0fQ.45GmjkoQHY4R4t86qH4B5ow2Taqr9sbBXqN8ZQ-nfsI'

    // 创建具有 service_role 权限的 Supabase 客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 验证用户 JWT 并获取用户信息
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: '无效的用户令牌' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // 检查用户是否有管理员权限
    // 这里假设你有一个 profiles 表，其中包含 is_admin 字段
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_admin) {
      return new Response(JSON.stringify({ error: '需要管理员权限' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // 根据请求的操作执行不同的管理任务
    let result
    switch (action) {
      case 'listUsers':
        // 列出所有用户 - 这需要 service_role 权限
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
        if (usersError) throw usersError
        result = { users }
        break

      case 'deleteUser':
        // 删除用户 - 这需要 service_role 权限
        if (!data.userId) throw new Error('缺少用户ID')
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId)
        if (deleteError) throw deleteError
        result = { success: true, message: '用户已删除' }
        break

      case 'updateUserRole':
        // 更新用户角色 - 这需要 service_role 权限
        if (!data.userId || data.isAdmin === undefined) throw new Error('缺少必要参数')
        
        // 更新 profiles 表中的 is_admin 字段
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_admin: data.isAdmin })
          .eq('id', data.userId)
        
        if (updateError) throw updateError
        result = { success: true, message: '用户角色已更新' }
        break

      default:
        throw new Error('未知操作')
    }

    // 返回成功响应
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    // 错误处理
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})