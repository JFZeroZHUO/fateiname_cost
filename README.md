# 名字算命 - AI智能姓名分析

基于豆包大模型的在线姓名分析工具，为用户提供专业的姓名学解读服务。

## 🌟 功能特色

- **智能分析**: 使用豆包大模型进行深度姓名分析
- **多维度解读**: 偏旁部首、笔画、命理学说三个维度全面分析
- **美观界面**: 中国传统文化风格的响应式设计
- **结果下载**: 支持将分析结果保存为高清图片
- **移动适配**: 完美适配手机、平板等移动设备

## 📱 在线体验

直接打开 `index.html` 文件即可在浏览器中使用。

## 🚀 快速开始

### 本地运行

1. 克隆或下载项目文件
2. 在浏览器中打开 `index.html`
3. 输入姓名，点击"开始分析"

### GitHub Pages 部署

1. 将项目上传到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择主分支作为源
4. 访问生成的网址

## 📁 项目结构

```
名字算命/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # JavaScript逻辑
├── PRD.md             # 产品需求文档
└── README.md          # 项目说明
```

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **AI模型**: 豆包大模型 (doubao-seed-1-6-250615)
- **图片生成**: html2canvas
- **字体**: Noto Serif SC (Google Fonts)

## 🎨 设计特色

### 视觉设计
- 中国传统文化配色方案
- 金色渐变主题色彩
- 圆润的卡片式布局
- 优雅的动画效果

### 用户体验
- 实时输入验证
- 加载状态提示
- 错误处理机制
- 响应式适配

## 📊 分析维度

### 偏旁部首分析
- 每个字的偏旁部首含义
- 五行属性分析
- 象征意义解读

### 笔画分析
- 笔画数统计
- 总笔画寓意
- 吉凶含义分析

### 命理学说分析
- 五行属性配置
- 阴阳平衡状况
- 音韵特点分析
- 字义深层含义

## 🔐 API 配置

项目使用火山引擎豆包大模型API，需要配置以下信息：

```javascript
const CONFIG = {
    API_KEY: 'your-api-key-here',
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    MODEL_ID: 'doubao-seed-1-6-250615'
};
```

### 获取API Key

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册并登录账号
3. 进入"方舟大模型"服务
4. 在API Key管理页面创建新的API Key
5. 将API Key替换到 `script.js` 文件中

## 📱 移动端适配

项目完全支持移动端访问：

- 响应式布局设计
- 触摸友好的交互
- 移动端优化的字体大小
- 适配不同屏幕尺寸

## 🛠️ 自定义配置

### 修改样式主题

在 `style.css` 中修改CSS变量：

```css
:root {
    --primary-color: #d4af37;    /* 主色调 */
    --secondary-color: #8b4513;  /* 辅助色 */
    --accent-color: #dc143c;     /* 强调色 */
}
```

### 调整分析提示词

在 `script.js` 的 `createAnalysisPrompt` 函数中修改提示词内容。

## 🔍 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- 移动端浏览器

## 📈 性能优化

- 使用CDN加载外部资源
- 图片懒加载
- CSS和JS文件压缩
- 响应式图片处理

## 🚨 注意事项

1. **API限制**: 请注意API调用频率限制和费用
2. **网络依赖**: 需要稳定的网络连接
3. **隐私保护**: 不存储用户输入的姓名信息
4. **仅供参考**: 分析结果仅供娱乐参考

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [豆包大模型](https://www.volcengine.com/product/doubao) - 提供AI分析能力
- [html2canvas](https://html2canvas.hertzen.com/) - 图片生成功能
- [Google Fonts](https://fonts.google.com/) - 中文字体支持

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**免责声明**: 本工具提供的姓名分析结果仅供娱乐和参考，不构成任何专业建议。