# Express服务器替代方案

## 简介
本项目使用Express服务器替代了原有的Supabase Edge Functions，提供更稳定的支付处理功能。

## 安装与运行

### 安装依赖
```bash
npm install
```

### 配置环境变量
项目根目录下已创建`.env`文件，包含所有必要的环境变量。如需修改，请直接编辑该文件。

### 启动服务器
开发模式（自动重启）:
```bash
npm run dev
```

生产模式:
```bash
npm start
```

## API端点

### 创建支付
- URL: `http://localhost:3000/api/create-payment`
- 方法: POST
- 需要认证: 是（Bearer Token）
- 请求体:
  ```json
  {
    "amount": 10.00,
    "productName": "购买100积分"
  }
  ```

### 支付通知
- URL: `http://localhost:3000/api/payment-notify`
- 方法: POST
- 需要认证: 否
- 说明: 由支付服务商回调，用于处理支付结果

## 前端集成
前端代码已更新为使用新的API端点。请确保在启动前端应用前，先启动Express服务器。