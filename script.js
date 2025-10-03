// 配置常量
window.CONFIG = {
    API_KEY: '477da57b-0015-4544-9142-ebadeb2dbbfb',
    API_URL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    MODEL_ID: 'doubao-seed-1-6-250615'
};

// DOM 元素
const elements = {
    nameInput: document.getElementById('nameInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    loadingAnimation: document.getElementById('loadingAnimation'),
    resultSection: document.getElementById('resultSection'),
    analyzedName: document.getElementById('analyzedName'),
    radicalAnalysis: document.getElementById('radicalAnalysis'),
    strokeAnalysis: document.getElementById('strokeAnalysis'),
    fortuneAnalysis: document.getElementById('fortuneAnalysis'),
    summaryAnalysis: document.getElementById('summaryAnalysis'),
    downloadBtn: document.getElementById('downloadBtn'),
    newAnalysisBtn: document.getElementById('newAnalysisBtn'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    closeErrorBtn: document.getElementById('closeErrorBtn'),
    btnText: document.querySelector('.btn-text'),
    btnLoading: document.querySelector('.btn-loading')
};

// 应用状态
let isAnalyzing = false;
let currentAnalysisResult = null;

// Supabase配置已在index.html中完成
// 当前用户信息
window.currentUser = null;
window.userPoints = 0;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化元素引用
    elements.nameInput.focus();
    checkLibraries();
    
    // 初始化事件监听器
    initializeEventListeners();
    
    // 初始化认证功能
    if (window.auth) {
        window.auth.initAuth();
    }
});

// 检查必要的库是否加载
function checkLibraries() {
    // 检查html2canvas
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas库未加载');
        // 尝试重新加载
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = function() {
            console.log('html2canvas库重新加载成功');
        };
        script.onerror = function() {
            console.error('html2canvas库加载失败');
        };
        document.head.appendChild(script);
    } else {
        console.log('html2canvas库已正确加载');
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    // 分析按钮点击事件
    elements.analyzeBtn.addEventListener('click', handleAnalyze);
    
    // 输入框回车事件
    elements.nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAnalyze();
        }
    });
    
    // 输入验证
    elements.nameInput.addEventListener('input', validateInput);
    
    // 下载按钮事件
    elements.downloadBtn.addEventListener('click', downloadResult);
    
    // 重新分析按钮事件
    elements.newAnalysisBtn.addEventListener('click', resetAnalysis);
    
    // 关闭错误提示事件
    elements.closeErrorBtn.addEventListener('click', hideError);
}

// 输入验证
function validateInput() {
    const name = elements.nameInput.value.trim();
    const isValid = /^[\u4e00-\u9fa5]{2,4}$/.test(name);
    
    elements.analyzeBtn.disabled = !isValid || isAnalyzing;
    
    // 实时提示
    if (name.length > 0 && !isValid) {
        if (name.length < 2) {
            showInputTip('姓名至少需要2个字符');
        } else if (name.length > 4) {
            showInputTip('姓名最多支持4个字符');
        } else if (!/^[\u4e00-\u9fa5]+$/.test(name)) {
            showInputTip('请输入中文姓名');
        }
    } else {
        hideInputTip();
    }
}

// 显示输入提示
function showInputTip(message) {
    const existingTip = document.querySelector('.input-error-tip');
    if (existingTip) {
        existingTip.textContent = message;
        return;
    }
    
    const tip = document.createElement('div');
    tip.className = 'input-error-tip';
    tip.style.cssText = `
        color: #e74c3c;
        font-size: 0.9rem;
        margin-top: 5px;
        text-align: center;
    `;
    tip.textContent = message;
    elements.nameInput.parentNode.appendChild(tip);
}

// 隐藏输入提示
function hideInputTip() {
    const tip = document.querySelector('.input-error-tip');
    if (tip) {
        tip.remove();
    }
}

// 处理分析请求
async function handleAnalyze() {
    const name = elements.nameInput.value.trim();
    
    if (!validateName(name)) {
        return;
    }
    
    // 检查用户是否登录
    if (!window.currentUser) {
        showError('请先登录再进行分析');
        return;
    }
    
    // 检查用户积分是否足够
    try {
        // 首先确保window.userPoints是最新的
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('points')
            .eq('id', window.currentUser.id)
            .single();
            
        if (profileError) {
            console.error('获取用户积分失败:', profileError);
            showError('无法获取您的积分信息');
            return;
        }
        
        // 更新全局变量，确保与数据库一致
        window.userPoints = profile.points;
        
        // 检查积分是否足够
        if (window.userPoints < 10) {
            showError('您的积分不足，需要至少10积分进行一次分析');
            return;
        }
        
        setAnalyzingState(true);
        hideError();
        
        const result = await analyzeNameWithAI(name);
        
        // 分析成功后扣除积分
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ points: window.userPoints - 10 })
            .eq('id', window.currentUser.id);
            
        if (updateError) {
            console.error('扣除积分失败:', updateError);
            // 继续显示结果，但记录错误
        } else {
            // 更新界面显示的积分和全局变量
            window.userPoints = window.userPoints - 10;
            const userPointsElement = document.getElementById('userPoints');
            if (userPointsElement) {
                userPointsElement.textContent = `积分: ${window.userPoints}`;
            }
        }
        
        displayResult(name, result);
    } catch (error) {
        console.error('分析失败:', error);
        showError('分析失败，请稍后重试。' + (error.message || ''));
    } finally {
        setAnalyzingState(false);
    }
}

// 验证姓名
function validateName(name) {
    if (!name) {
        showError('请输入姓名');
        return false;
    }
    
    if (!/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
        showError('请输入2-4个中文字符的姓名');
        return false;
    }
    
    return true;
}

// 设置分析状态
function setAnalyzingState(analyzing) {
    isAnalyzing = analyzing;
    elements.analyzeBtn.disabled = analyzing;
    
    if (analyzing) {
        elements.btnText.style.display = 'none';
        elements.btnLoading.style.display = 'inline';
        elements.loadingAnimation.style.display = 'block';
        elements.resultSection.style.display = 'none';
    } else {
        elements.btnText.style.display = 'inline';
        elements.btnLoading.style.display = 'none';
        elements.loadingAnimation.style.display = 'none';
    }
}

// 调用豆包AI分析姓名
async function analyzeNameWithAI(name) {
    const prompt = createAnalysisPrompt(name);
    
    const requestBody = {
        model: CONFIG.MODEL_ID,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 2000
    };
    
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API调用失败 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API返回数据格式错误');
    }
    
    return parseAnalysisResult(data.choices[0].message.content);
}

// 创建分析提示词
function createAnalysisPrompt(name) {
    return `请以科学理性的态度，结合中国传统文化智慧，对姓名"${name}"进行文化内涵分析。这是一种文化传承和情绪价值的体现，而非迷信预测：

【偏旁部首分析】：
- 分析每个字的**偏旁部首**的文化含义和历史渊源
- 探讨字形结构所体现的**古人智慧**和**文化象征**
- 从文字学角度解读**五行文化**（金木水火土）的哲学思想

【笔画分析】：
- 分析笔画数在传统文化中的**象征意义**
- 探讨**数字文化**在中华文明中的哲学内涵
- 从美学角度欣赏汉字的**结构美感**和**书写韵律**

【命理学说分析】：
- 介绍传统**五格剖象法**作为文化遗产的价值
- 解读**三才配置**（天人地）体现的古代哲学思想
- 从心理学角度分析姓名可能带来的**心理暗示**和**性格塑造**
- 强调这是**文化传统**，可作为**自我激励**的参考

【综合评价】：
- 总结姓名的**文化底蕴**和**美好寓意**
- 分析可能的**性格优势**，鼓励发扬光大
- 提供**积极正面**的人生建议和**自我提升**方向
- 强调**人定胜天**，命运掌握在自己手中

请以传承文化、提供情绪价值为目的，用温暖积极的语言，每个部分控制在200字以内。用**粗体**标记文化关键词，用- 列表格式组织内容。`;
}

// 解析分析结果
function parseAnalysisResult(content) {
    const sections = {
        radical: '',
        stroke: '',
        fortune: '',
        summary: ''
    };
    
    // 使用正则表达式提取各个部分
    const radicalMatch = content.match(/【偏旁部首分析】([\s\S]*?)(?=【|$)/);
    const strokeMatch = content.match(/【笔画分析】([\s\S]*?)(?=【|$)/);
    const fortuneMatch = content.match(/【命理学说分析】([\s\S]*?)(?=【|$)/);
    const summaryMatch = content.match(/【综合评价】([\s\S]*?)(?=【|$)/);
    
    sections.radical = radicalMatch ? radicalMatch[1].trim() : '暂无偏旁部首分析';
    sections.stroke = strokeMatch ? strokeMatch[1].trim() : '暂无笔画分析';
    sections.fortune = fortuneMatch ? fortuneMatch[1].trim() : '暂无命理学说分析';
    sections.summary = summaryMatch ? summaryMatch[1].trim() : '暂无综合评价';
    
    // 如果没有找到结构化内容，尝试简单分割
    if (!radicalMatch && !strokeMatch && !fortuneMatch && !summaryMatch) {
        const paragraphs = content.split('\n').filter(p => p.trim());
        const quarterLength = Math.ceil(paragraphs.length / 4);
        
        sections.radical = paragraphs.slice(0, quarterLength).join('\n');
        sections.stroke = paragraphs.slice(quarterLength, quarterLength * 2).join('\n');
        sections.fortune = paragraphs.slice(quarterLength * 2, quarterLength * 3).join('\n');
        sections.summary = paragraphs.slice(quarterLength * 3).join('\n');
    }
    
    return sections;
}

// 显示分析结果
function displayResult(name, result) {
    currentAnalysisResult = { name, result };
    
    elements.analyzedName.textContent = `"${name}" 的姓名分析`;
    
    // 格式化并显示各部分内容
    elements.radicalAnalysis.innerHTML = formatAnalysisContent(result.radical);
    elements.strokeAnalysis.innerHTML = formatAnalysisContent(result.stroke);
    elements.fortuneAnalysis.innerHTML = formatAnalysisContent(result.fortune);
    elements.summaryAnalysis.innerHTML = formatAnalysisContent(result.summary);
    
    // 显示结果区域
    elements.resultSection.style.display = 'block';
    elements.resultSection.classList.add('fade-in');
    
    // 滚动到结果区域
    elements.resultSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

// 格式化分析内容
function formatAnalysisContent(content) {
    if (!content || content.trim() === '') {
        return '<p>暂无相关分析内容</p>';
    }
    
    // 将内容按行分割并格式化
    const lines = content.split('\n').filter(line => line.trim());
    let formattedContent = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (line) {
            // 处理Markdown标题格式
            if (line.startsWith('####')) {
                const title = line.replace(/^#+\s*/, '').trim();
                formattedContent += `<h4 class="analysis-subtitle">${highlightKeywords(title)}</h4>`;
            } else if (line.startsWith('###')) {
                const title = line.replace(/^#+\s*/, '').trim();
                formattedContent += `<h3 class="analysis-subtitle">${highlightKeywords(title)}</h3>`;
            } else if (line.startsWith('##')) {
                const title = line.replace(/^#+\s*/, '').trim();
                formattedContent += `<h3 class="analysis-subtitle">${highlightKeywords(title)}</h3>`;
            } else if (line.startsWith('#')) {
                const title = line.replace(/^#+\s*/, '').trim();
                formattedContent += `<h3 class="analysis-subtitle">${highlightKeywords(title)}</h3>`;
            } 
            // 处理粗体格式
            else if (line.includes('**')) {
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formattedContent += `<p class="analysis-text">${highlightKeywords(line)}</p>`;
            }
            // 处理列表项
            else if (line.startsWith('- ') || line.startsWith('* ')) {
                const listItem = line.replace(/^[-*]\s*/, '').trim();
                formattedContent += `<div class="analysis-item">• ${highlightKeywords(listItem)}</div>`;
            }
            // 处理数字列表
            else if (/^\d+\.\s/.test(line)) {
                const listItem = line.replace(/^\d+\.\s*/, '').trim();
                formattedContent += `<div class="analysis-item numbered">${highlightKeywords(listItem)}</div>`;
            }
            // 普通段落
            else {
                formattedContent += `<p class="analysis-text">${highlightKeywords(line)}</p>`;
            }
        }
    });
    
    return formattedContent || '<p>暂无相关分析内容</p>';
}

// 高亮关键词
function highlightKeywords(text) {
    const keywords = [
        '五行', '金木水火土', '阴阳', '吉祥', '寓意', '象征', '代表',
        '笔画', '偏旁', '部首', '音韵', '字义', '含义', '特点',
        '优势', '建议', '注意', '平衡', '和谐', '美好'
    ];
    
    keywords.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'g');
        text = text.replace(regex, '<span class="highlight">$1</span>');
    });
    
    return text;
}

// 下载分析结果为图片
async function downloadResult() {
    if (!currentAnalysisResult) {
        showError('没有可下载的分析结果');
        return;
    }
    
    try {
        console.log('开始生成图片...');
        
        // 检查html2canvas是否加载
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas库未正确加载');
        }
        
        // 获取结果内容区域（只包含分析结果，不包括标题和按钮）
        const resultContent = document.getElementById('resultContent');
        if (!resultContent) {
            throw new Error('找不到结果内容区域');
        }
        
        // 创建一个临时容器用于截图
        const tempContainer = document.createElement('div');
        tempContainer.className = 'temp-screenshot-container';
        tempContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 800px;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            z-index: -1;
        `;
        
        // 添加姓名标题
        const nameTitle = document.createElement('h2');
        nameTitle.style.cssText = `
            text-align: center;
            color: #d4af37;
            margin-bottom: 20px;
            font-size: 24px;
            font-family: 'Noto Serif SC', serif;
        `;
        nameTitle.textContent = `"${currentAnalysisResult.name}" 的姓名分析`;
        tempContainer.appendChild(nameTitle);
        
        // 克隆结果内容
        const contentClone = resultContent.cloneNode(true);
        tempContainer.appendChild(contentClone);
        
        // 添加页脚
        const footer = document.createElement('div');
        footer.style.cssText = `
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        `;
        footer.textContent = `生成时间: ${new Date().toLocaleString('zh-CN')} | 基于传统文化传承，仅供参考`;
        tempContainer.appendChild(footer);
        
        // 添加到文档中
        document.body.appendChild(tempContainer);
        
        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('开始调用html2canvas...');
        // 使用高清配置
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: '#ffffff',
            scale: 2, // 提高清晰度
            useCORS: true,
            allowTaint: true,
            logging: false,
            height: tempContainer.scrollHeight, // 确保捕获完整高度
            width: 800 // 固定宽度
        });
        
        // 移除临时容器
        document.body.removeChild(tempContainer);
        
        console.log('Canvas生成成功:', {
            width: canvas.width,
            height: canvas.height
        });
        
        // 转换为高质量图片数据
        const imageData = canvas.toDataURL('image/png', 1.0);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${currentAnalysisResult.name}_姓名分析_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = imageData;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('图片下载完成');
        showSuccess('分析结果已保存为高清图片');
        
    } catch (error) {
        console.error('下载失败详细信息:', error);
        console.error('错误堆栈:', error.stack);
        
        // 尝试备用下载方法
        try {
            console.log('尝试备用下载方法...');
            await downloadResultAsText();
        } catch (fallbackError) {
            console.error('备用下载方法也失败:', fallbackError);
            showError(`图片生成失败: ${error.message}。请尝试截图保存。`);
        }
    }
}

// 显示Canvas预览（用于调试）
function showCanvasPreview(canvas) {
    // 移除之前的预览
    const existingPreview = document.querySelector('.canvas-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const preview = document.createElement('div');
    preview.className = 'canvas-preview';
    preview.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '图片预览';
    title.style.cssText = 'margin-bottom: 10px; text-align: center;';
    
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'max-width: 100%; height: auto; border: 1px solid #ddd;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭预览';
    closeBtn.style.cssText = `
        display: block;
        margin: 10px auto 0;
        padding: 8px 16px;
        background: #d4af37;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    closeBtn.onclick = () => preview.remove();
    
    preview.appendChild(title);
    preview.appendChild(img);
    preview.appendChild(closeBtn);
    document.body.appendChild(preview);
    
    // 3秒后自动关闭
    setTimeout(() => {
        if (preview.parentNode) {
            preview.remove();
        }
    }, 3000);
}

// 显示canvas预览
function showCanvasPreview(canvas) {
    // 移除之前的预览
    const existingPreview = document.querySelector('.canvas-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const preview = document.createElement('div');
    preview.className = 'canvas-preview';
    preview.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '图片预览';
    title.style.cssText = 'margin-bottom: 10px; text-align: center;';
    
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = 'max-width: 100%; height: auto; border: 1px solid #ddd;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭预览';
    closeBtn.style.cssText = `
        display: block;
        margin: 10px auto 0;
        padding: 8px 16px;
        background: #d4af37;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    closeBtn.onclick = () => preview.remove();
    
    preview.appendChild(title);
    preview.appendChild(img);
    preview.appendChild(closeBtn);
    document.body.appendChild(preview);
    
    // 3秒后自动关闭
    setTimeout(() => {
        if (preview.parentNode) {
            preview.remove();
        }
    }, 3000);
}

// 备用下载方法：保存为文本文件
async function downloadResultAsText() {
    if (!currentAnalysisResult) {
        throw new Error('没有可下载的分析结果');
    }
    
    // 提取文本内容
    const content = `
姓名文化内涵分析报告
==================

姓名：${currentAnalysisResult.name}
生成时间：${new Date().toLocaleString('zh-CN')}

偏旁部首分析
-----------
${elements.radicalAnalysis.textContent}

笔画分析
-------
${elements.strokeAnalysis.textContent}

命理学说分析
-----------
${elements.fortuneAnalysis.textContent}

综合评价
-------
${elements.summaryAnalysis.textContent}

==================
本分析基于传统文化传承，仅供参考
    `.trim();
    
    // 创建文本文件下载
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${currentAnalysisResult.name}_姓名分析_${new Date().toISOString().slice(0, 10)}.txt`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showSuccess('分析结果已保存为文本文件');
}

// 重新分析
function resetAnalysis() {
    elements.resultSection.style.display = 'none';
    elements.nameInput.value = '';
    elements.nameInput.focus();
    currentAnalysisResult = null;
    hideError();
    hideInputTip();
}

// 显示错误信息
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.errorMessage.scrollIntoView({ behavior: 'smooth' });
}

// 隐藏错误信息
function hideError() {
    elements.errorMessage.style.display = 'none';
}

// 显示成功信息
function showSuccess(message) {
    // 创建临时成功提示
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: inherit;
        font-size: 0.9rem;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    showError('应用出现错误，请刷新页面重试');
});

// 网络状态检测
window.addEventListener('online', function() {
    hideError();
});

window.addEventListener('offline', function() {
    showError('网络连接已断开，请检查网络设置');
});