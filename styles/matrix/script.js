// Matrix主题特效处理函数

/**
 * 创建Matrix文字雨效果
 * @param {Object} styles - Matrix主题样式对象
 * @param {Object} content - 页面内容对象
 * @returns {Function} 清理函数
 */
export function createMatrixRainEffect(styles, content) {
  // 先清除可能存在的旧文字雨
  const oldRain = document.querySelector(`.${styles.matrixRain}`);
  if (oldRain) {
    oldRain.remove();
  }
  
  const container = document.querySelector(`.${styles.container}`);
  if (!container) return () => {};
  
  // 创建文字雨容器
  const matrixRain = document.createElement('div');
  matrixRain.classList.add(styles.matrixRain);
  container.appendChild(matrixRain);
  
  // 定义可能出现的文字
  // 如果用户设置了自定义文字，则使用用户设置的文字，否则使用默认文字
  const defaultTexts = [
    '不离不弃', '一生一世', '小叶我爱你', '七夕是我们专属',
    '不离', '不弃', '一生', '一世', '小叶', '我爱你',
    '七夕', '专属', '相遇', '缘分', '爱情', '永恒'
  ];
  
  // 使用用户自定义文字或默认文字
  const texts = Array.isArray(content.matrixTexts) && content.matrixTexts.length > 0 
    ? content.matrixTexts 
    : defaultTexts;
  
  // 创建多个文字元素，均匀分布在屏幕上
  const wordCount = 150; // 减少文字数量，从300减少到150
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;
  
  // 将屏幕划分为网格，确保文字分布均匀
  const gridCols = 15;
  const gridRows = 10;
  const cellWidth = containerWidth / gridCols;
  const cellHeight = containerHeight / gridRows;
  
  for (let i = 0; i < wordCount; i++) {
    // 随机选择一个词语
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    
    // 创建词语元素
    const word = document.createElement('div');
    word.classList.add(styles.matrixWord);
    word.textContent = randomText;
    
    // 计算网格位置，确保文字分布均匀
    const gridCol = i % gridCols;
    const gridRow = Math.floor(i / gridCols) % gridRows;
    
    // 在网格单元内随机位置
    const x = gridCol * cellWidth + Math.random() * cellWidth * 0.8;
    
    // 修改初始位置，使文字在一开始就分布在整个屏幕高度范围内
    // 使用网格行来确定初始高度，确保文字均匀分布在整个屏幕
    const initialY = -containerHeight + (containerHeight * 2 * (i / wordCount));
    
    // 随机大小 (0.6-3倍)，更大的范围
    const scale = 0.6 + Math.random() * 2.4;
    
    // 随机深度 (Z轴)
    const z = Math.random() * 500 - 250;
    
    // 随机旋转
    const rotateX = Math.random() * 20 - 10;
    const rotateY = Math.random() * 20 - 10;
    
    // 随机动画时间（非匀速效果）
    const duration = 10 + Math.random() * 30;
    
    // 随机延迟，确保文字不会同时开始动画
    // 使用更小的延迟范围，让文字立即开始动画
    const delay = Math.random() * 5;
    
    // 随机透明度
    const opacity = 0.5 + Math.random() * 0.5;
    
    // 应用样式
    word.style.left = `${x}px`;
    word.style.top = `${initialY}px`; // 使用新的初始高度计算方式
    word.style.fontSize = `${scale}rem`;
    word.style.transform = `translateZ(${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    word.style.animationDuration = `${duration}s`;
    word.style.animationDelay = `${delay}s`;
    word.style.opacity = opacity;
    
    // 随机颜色变化 (紫色到粉色的渐变)
    const hue = 280 + Math.random() * 40; // 紫色范围
    const saturation = 70 + Math.random() * 30;
    const lightness = 50 + Math.random() * 20;
    word.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    word.style.textShadow = `0 0 8px hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    matrixRain.appendChild(word);
  }
  
  // 创建心形气泡
  const heartCount = 50; // 减少心形数量，从100减少到50
  
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('div');
    heart.classList.add(styles.heart);
    heart.innerHTML = '❤';
    
    // 随机位置
    const x = Math.random() * containerWidth;
    
    // 修改初始位置，使心形在一开始就分布在整个屏幕高度范围内
    const initialY = -containerHeight + (containerHeight * 2 * (i / heartCount));
    
    // 随机大小 (0.5-3倍)
    const scale = 0.5 + Math.random() * 2.5;
    
    // 随机动画时间（非匀速效果）
    const duration = 10 + Math.random() * 20;
    
    // 随机延迟
    const delay = Math.random() * 10;
    
    // 随机透明度
    const opacity = 0.3 + Math.random() * 0.7;
    
    // 应用样式
    heart.style.left = `${x}px`;
    heart.style.top = `${initialY}px`; // 使用新的初始高度计算方式
    heart.style.fontSize = `${scale}rem`;
    heart.style.animationDuration = `${duration}s`;
    heart.style.animationDelay = `${delay}s`;
    heart.style.opacity = opacity;
    
    // 随机颜色变化 (红色到粉色的渐变)
    const hue = 330 + Math.random() * 30; // 红粉色范围
    const saturation = 80 + Math.random() * 20;
    const lightness = 60 + Math.random() * 20;
    heart.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    heart.style.textShadow = `0 0 8px hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    matrixRain.appendChild(heart);
  }
  
  // 确保文字雨在最底层
  container.insertBefore(matrixRain, container.firstChild);
  
  // 窗口大小变化时重新创建
  const handleResize = () => {
    const oldRain = document.querySelector(`.${styles.matrixRain}`);
    if (oldRain) {
      oldRain.remove();
    }
    createMatrixRainEffect(styles, content);
  };
  
  window.addEventListener('resize', handleResize);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('resize', handleResize);
    const matrixRain = document.querySelector(`.${styles.matrixRain}`);
    if (matrixRain) {
      matrixRain.remove();
    }
  };
}

/**
 * 创建动态背景粒子效果
 * @param {Object} styles - Matrix主题样式对象
 * @returns {Function} 清理函数
 */
export function createDynamicBackground(styles) {
  const container = document.querySelector(`.${styles.container}`);
  if (!container) return () => {};
  
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add(styles.particle);
    
    // 随机位置和大小
    const size = Math.random() * 10 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    // 随机动画延迟
    particle.style.animationDelay = `${Math.random() * 10}s`;
    
    container.appendChild(particle);
  }
  
  // 返回清理函数
  return () => {
    if (container) {
      const particles = container.querySelectorAll(`.${styles.particle}`);
      particles.forEach(p => p.remove());
    }
  };
}