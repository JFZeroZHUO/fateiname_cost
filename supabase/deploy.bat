@echo off
echo Supabase Functions 自动部署脚本
echo ==============================

REM 设置项目引用ID (请替换为您的项目ID)
set PROJECT_REF=dbxjjbegydyudxqzfips

echo 1. 链接到Supabase项目...
supabase link --project-ref %PROJECT_REF%

echo 2. 部署所有函数...
echo 正在部署 create-payment 函数...
supabase functions deploy create-payment --no-verify-jwt
echo 正在部署 payment-notify 函数...
supabase functions deploy payment-notify --no-verify-jwt
echo 正在部署 admin 函数...
supabase functions deploy admin --no-verify-jwt

echo 3. 列出已部署的函数...
supabase functions list

echo 部署完成!
echo 函数URL格式: https://%PROJECT_REF%.supabase.co/functions/v1/[function-name]
pause