# Supabase Edge Functions 部署指南

## 前提条件

1. 安装 Supabase CLI
   ```bash
   # 使用 npm 安装
   npm install supabase@latest -g

   # 或使用 Homebrew (macOS)
   brew install supabase/tap/supabase
   ```

2. 登录 Supabase
   ```bash
   supabase login
   ```

## 部署步骤

1. 链接到你的 Supabase 项目
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. 设置环境变量
   ```bash
   # 复制示例环境文件
   cp .env.example .env
   
   # 编辑 .env 文件，填入实际的 URL 和 SERVICE_ROLE_KEY
   # 然后运行:
   supabase secrets set --env-file .env
   ```

3. 部署函数
   ```bash
   supabase functions deploy admin --no-verify-jwt
   ```

4. 获取函数 URL
   ```bash
   supabase functions list
   ```
   
   函数 URL 格式为: `https://<project-ref>.supabase.co/functions/v1/admin`

## 安全注意事项

1. 确保 `.env` 文件不要提交到版本控制系统
2. 在前端代码中更新函数 URL
3. 确保在 Edge Function 中实现了适当的权限检查
4. 考虑启用 JWT 验证 (部署时不使用 `--no-verify-jwt` 选项)

## 测试部署

部署后，可以使用 `admin-api-example.js` 中的函数测试 Edge Function 是否正常工作。

## 故障排除

如果遇到问题，可以查看函数日志:
```bash
supabase functions logs admin
```