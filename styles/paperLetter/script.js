/**
 * paperLetter 主题的动效脚本
 * 实现一支笔在纸上写下一封信的效果
 */

// 创建信纸主题效果
export function createPaperEffects(styles, content) {
  // 确保在浏览器环境中运行
  if (typeof window === 'undefined') return () => {};

  // 创建笔元素
  const createPen = () => {
    const pen = document.createElement('div');
    pen.className = styles.pen;
    document.body.appendChild(pen);
    return pen;
  };

  // 创建信纸内容区域
  const setupLetterContent = () => {
    // 创建信纸容器
    const letterContainer = document.createElement('div');
    letterContainer.className = styles.letterContainer;
    
    // 创建信纸内容区域
    const letterContent = document.createElement('div');
    letterContent.className = styles.letterContent;
    letterContainer.appendChild(letterContent);
    
    // 添加到页面
    const container = document.querySelector(`.${styles.container}`);
    if (container) {
      // 清空现有内容
      const existingLetter = container.querySelector(`.${styles.letterContainer}`);
      if (existingLetter) {
        container.removeChild(existingLetter);
      }
      container.appendChild(letterContainer);
    } else {
      document.body.appendChild(letterContainer);
    }
    
    return letterContent;
  };

  // 打字机效果函数
  const typewriterEffect = (element, text, speed, onComplete, penElement) => {
    let i = 0;
    element.innerHTML = '';
    
    // 获取元素位置
    const updatePenPosition = () => {
      if (!penElement) return;
      
      // 计算当前字符位置
      const rect = element.getBoundingClientRect();
      const textNode = element.childNodes[0];
      
      if (!textNode) {
        // 如果还没有文本，将笔放在元素开始位置
        penElement.style.left = `${rect.left}px`;
        penElement.style.top = `${rect.top}px`;
        return;
      }
      
      // 创建临时范围来获取当前字符位置
      const range = document.createRange();
      range.setStart(textNode, Math.min(i, text.length));
      range.setEnd(textNode, Math.min(i, text.length));
      const charRect = range.getBoundingClientRect();
      
      // 设置笔的位置
      penElement.style.left = `${charRect.right + 5}px`;
      penElement.style.top = `${charRect.top - 5}px`;
      
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
        if (penElement) penElement.classList.remove(styles.penWriting);
        if (onComplete) onComplete();
      }
    };
    
    updatePenPosition();
    type();
  };

  // 开始动画序列
  const startAnimation = () => {
    const pen = createPen();
    const letterContent = setupLetterContent();
    if (!letterContent) return;
    
    // 创建标题元素
    const titleElement = document.createElement('h1');
    titleElement.className = styles.letterTitle;
    letterContent.appendChild(titleElement);
    
    // 获取信纸文本内容
    const paperTexts = content.paperLetterTexts || [];
    
    // 创建正文段落元素
    const paragraphElements = paperTexts.map(text => {
      const p = document.createElement('p');
      p.className = styles.letterBody;
      letterContent.appendChild(p);
      return p;
    });
    
    // 如果没有文本，添加一个默认段落
    if (paragraphElements.length === 0) {
      const defaultP = document.createElement('p');
      defaultP.className = styles.letterBody;
      letterContent.appendChild(defaultP);
      paragraphElements.push(defaultP);
    }
    
    // 创建签名元素
    const signatureElement = document.createElement('div');
    signatureElement.className = styles.letterSignature;
    letterContent.appendChild(signatureElement);
    
    // 动画序列
    typewriterEffect(titleElement, content.title || '亲爱的朋友', 100, () => {
      // 标题打完后，开始打正文
      let currentParagraph = 0;
      
      const typeParagraph = () => {
        if (currentParagraph < paragraphElements.length) {
          const text = paperTexts[currentParagraph] || '这是一封来自心底的信...';
          typewriterEffect(paragraphElements[currentParagraph], text, 50, () => {
            currentParagraph++;
            typeParagraph();
          }, pen);
        } else {
          // 所有段落打完后，开始打签名
          typewriterEffect(signatureElement, '祝好，', 120, () => {
            // 全部完成后，隐藏笔
            setTimeout(() => {
              pen.style.opacity = '0';
              setTimeout(() => {
                pen.remove();
              }, 1000);
            }, 500);
          }, pen);
        }
      };
      
      typeParagraph();
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

// 为了兼容性，保留原有的函数
export function createPaperLetterEffect(styles, content) {
  return createPaperEffects(styles, content);
}

// 导出主题效果创建函数
export function createThemeEffect(styles, content) {
  return createPaperEffects(styles, content);
}