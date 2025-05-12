/**
 * paperLetter 主题的动效脚本
 * 实现一支笔在纸上写下一封信的效果
 */

// 创建打字机效果和笔的动画
export function createPaperLetterEffect(styles, content) {
  // 确保在浏览器环境中运行
  if (typeof window === 'undefined') return;

  // 创建笔元素
  const createPen = () => {
    const pen = document.createElement('div');
    pen.className = styles.pen;
    document.body.appendChild(pen);
    return pen;
  };

  // 创建信纸内容区域
  const setupLetterContent = () => {
    // 查找信纸内容容器
    const letterContent = document.querySelector(`.${styles.letterContent}`);
    if (!letterContent) return null;

    // 清空现有内容
    letterContent.innerHTML = '';
    
    // 创建标题元素
    const titleElement = document.createElement('div');
    titleElement.className = styles.letterTitle;
    letterContent.appendChild(titleElement);
    
    // 创建正文元素
    const bodyElement = document.createElement('div');
    bodyElement.className = styles.letterBody;
    letterContent.appendChild(bodyElement);
    
    // 创建签名元素
    const signatureElement = document.createElement('div');
    signatureElement.className = styles.letterSignature;
    letterContent.appendChild(signatureElement);
    
    return {
      title: titleElement,
      body: bodyElement,
      signature: signatureElement,
      container: letterContent
    };
  };

  // 打字机效果函数
  const typewriterEffect = (element, text, speed, onComplete, penElement) => {
    let i = 0;
    element.innerHTML = '';
    
    // 获取元素位置
    const updatePenPosition = () => {
      if (!penElement) return;
      
      // 计算当前字符位置
      const textNode = element.childNodes[0];
      if (!textNode) {
        // 如果还没有文本，将笔放在元素开始位置
        const rect = element.getBoundingClientRect();
        penElement.style.left = `${rect.left}px`;
        penElement.style.top = `${rect.top}px`;
        return;
      }
      
      // 创建临时范围来获取当前字符位置
      const range = document.createRange();
      range.setStart(textNode, Math.min(i, text.length));
      range.setEnd(textNode, Math.min(i, text.length));
      const rect = range.getBoundingClientRect();
      
      // 设置笔的位置
      penElement.style.left = `${rect.right + 5}px`;
      penElement.style.top = `${rect.top - 5}px`;
      
      // 添加笔的写字动画
      penElement.classList.add(styles.penWriting);
    };
    
    const type = () => {
      if (i < text.length) {
        element.innerHTML = text.substring(0, i + 1);
        i++;
        updatePenPosition();
        setTimeout(type, speed);
      } else {
        // 完成打字
        penElement.classList.remove(styles.penWriting);
        if (onComplete) onComplete();
      }
    };
    
    updatePenPosition();
    type();
  };

  // 开始动画序列
  const startAnimation = () => {
    const pen = createPen();
    const elements = setupLetterContent();
    if (!elements) return;
    
    // 准备内容
    const titleText = `亲爱的${content.name || '朋友'}：`;
    const bodyText = content.greeting || '祝你天天开心，事事顺利！';
    const signatureText = `${content.wishText || '祝福你的人'}`;
    
    // 动画序列
    typewriterEffect(elements.title, titleText, 100, () => {
      // 标题打完后，开始打正文
      typewriterEffect(elements.body, bodyText, 80, () => {
        // 正文打完后，开始打签名
        typewriterEffect(elements.signature, signatureText, 120, () => {
          // 全部完成后，隐藏笔
          setTimeout(() => {
            pen.style.opacity = '0';
            setTimeout(() => {
              pen.remove();
            }, 1000);
          }, 500);
        }, pen);
      }, pen);
    }, pen);
  };

  // 当页面加载完成后开始动画
  if (document.readyState === 'complete') {
    startAnimation();
  } else {
    window.addEventListener('load', startAnimation);
  }

  // 返回清理函数
  return () => {
    const pen = document.querySelector(`.${styles.pen}`);
    if (pen) pen.remove();
    window.removeEventListener('load', startAnimation);
  };
}

// 导出主题效果创建函数
export function createThemeEffect(styles, content) {
  return createPaperLetterEffect(styles, content);
}