/**
 * 梦幻星空主题特效脚本
 * 用于在星空背景中显示用户自定义文字
 */

// 创建梦幻星空特效
export function createDreamySkyEffect(styles, content) {
    // 添加调试信息
    console.log('创建梦幻星空特效', styles, content);
    
    // 确保有内容对象
    if (!content) return () => {};
    
    // 获取dreamySkyTexts数组，如果不存在则使用空数组
    const dreamySkyTexts = content.dreamySkyTexts || [];
    console.log('梦幻星空文字数组:', dreamySkyTexts);
    
    // 创建3D飞机动画结构
    const createSkyStructure = () => {
      // 检查是否已存在结构
      if (document.getElementById('bg') || document.getElementById('view')) {
        console.log('3D结构已存在，跳过创建');
        return;
      }
      
      // 获取容器元素 - 修改为更通用的选择器
      const container = document.querySelector(`.${styles.container}`) || document.querySelector('.container') || document.querySelector(`.${styles.dreamSkyPreview}`) || document.body;
      console.log('找到容器元素:', container, '使用选择器:', styles.container, styles.dreamSkyPreview);
      
      if (!container) {
        console.error('未找到容器元素，无法创建3D结构');
        return;
      }
      
      // 创建背景元素
      const bg = document.createElement('div');
      bg.id = 'bg';
      bg.className = styles.bgElement;
      container.appendChild(bg);
      console.log('创建背景元素:', bg);
      
      // 创建视图元素
      const view = document.createElement('div');
      view.id = 'view';
      view.className = styles.view;
      container.appendChild(view);
      console.log('创建视图元素:', view, '应用样式类:', styles.view);
      
      // 创建相机元素
      const camera = document.createElement('div');
      camera.id = 'camera';
      camera.className = styles.camera;
      view.appendChild(camera);
      console.log('创建相机元素:', camera, '应用样式类:', styles.camera);
      
      // 创建地板元素
      const floor = document.createElement('div');
      floor.id = 'floor';
      floor.className = styles.floor;
      camera.appendChild(floor);
      console.log('创建地板元素:', floor, '应用样式类:', styles.floor);
      
      // 创建飞机元素
      const airplane = document.createElement('div');
      airplane.id = 'airplane';
      airplane.className = styles.airplane;
      camera.appendChild(airplane);
      console.log('创建飞机元素:', airplane, '应用样式类:', styles.airplane);
      
      // 创建飞机组件 - 左翼
      const wingLeft = document.createElement('div');
      wingLeft.className = styles.wingLeft;
      
      // 添加伪元素效果（通过额外的div实现）
      const wingLeftBefore = document.createElement('div');
      wingLeftBefore.className = styles.wingLeftBefore;
      wingLeft.appendChild(wingLeftBefore);
      
      airplane.appendChild(wingLeft);
      
      // 创建飞机组件 - 右翼
      const wingRight = document.createElement('div');
      wingRight.className = styles.wingRight;
      
      // 添加伪元素效果（通过额外的div实现）
      const wingRightBefore = document.createElement('div');
      wingRightBefore.className = styles.wingRightBefore;
      wingRight.appendChild(wingRightBefore);
      
      airplane.appendChild(wingRight);
      
      // 创建飞机机身
      const body = document.createElement('div');
      body.className = styles.airplaneBody;
      airplane.appendChild(body);
      
      // 创建飞机尾翼
      const tail = document.createElement('div');
      tail.className = styles.airplaneTail;
      airplane.appendChild(tail);
      
      // 添加飞机阴影
      const shadow = document.createElement('div');
      shadow.className = styles.airplaneShadow;
      airplane.appendChild(shadow);
      
      // 添加飞机尾迹效果
      const trail = document.createElement('div');
      trail.className = styles.airplaneTrail;
      airplane.appendChild(trail);
      
      // 添加飞机动画
      airplane.animate(
        [
          { transform: 'translateY(-5px) rotateX(2deg)' },
          { transform: 'translateY(5px) rotateX(-2deg)' },
          { transform: 'translateY(-5px) rotateX(2deg)' }
        ],
        {
          duration: 6000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
      
      // 尾迹动画
      trail.animate(
        [
          { opacity: 0.4, width: '250px' },
          { opacity: 0.8, width: '300px' },
          { opacity: 0.4, width: '250px' }
        ],
        {
          duration: 3000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
      
      // 阴影动画，跟随飞机移动
      shadow.animate(
        [
          { transform: 'scale(1, 0.3) rotateX(60deg) translateY(-5px)' },
          { transform: 'scale(1, 0.3) rotateX(60deg) translateY(5px)' },
          { transform: 'scale(1, 0.3) rotateX(60deg) translateY(-5px)' }
        ],
        {
          duration: 6000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
      
      console.log('3D结构创建完成');
    };
    
    // 创建星空文字元素
    const createStarTexts = () => {
      // 获取floor元素，用于放置文字
      const floorElements = document.getElementsByClassName(styles.floor);
      if (floorElements.length === 0) {
        console.error('未找到地板元素，无法创建文字');
        return;
      }
      
      const floor = floorElements[0];
      console.log('找到地板元素:', floor);
      
      // 清除已有的文字元素
      const existingTexts = floor.querySelectorAll('.star-text');
      existingTexts.forEach(text => text.remove());
      console.log('清除已有文字元素:', existingTexts.length);
      
      // 为每个文字创建元素并添加到floor上
      dreamySkyTexts.forEach((text, index) => {
        const textElement = document.createElement('div');
        textElement.className = `star-text ${styles.starText}`;
        textElement.textContent = text;
        
        // 设置随机位置
        textElement.style.left = `${Math.random() * 1200 + 200}px`;
        textElement.style.top = `${Math.random() * 1200 + 200}px`;
        textElement.style.transform = 'translateZ(-400px)';
        
        // 添加动画
        textElement.animate(
          [
            { opacity: 0, transform: 'translateZ(-450px)' },
            { opacity: 0.9, transform: 'translateZ(-400px)' },
            { opacity: 0, transform: 'translateZ(-350px)' }
          ],
          {
            duration: 8000 + (index * 1000),
            iterations: Infinity,
            delay: index * 2000,
            easing: 'ease-in-out'
          }
        );
        
        floor.appendChild(textElement);
        console.log(`创建文字元素 ${index+1}/${dreamySkyTexts.length}:`, text);
      });
      
      console.log('文字元素创建完成');
    };
    
    // 初始创建3D结构
    console.log('开始创建3D结构');
    createSkyStructure();
    
    // 初始创建文字
    console.log('开始创建文字');
    createStarTexts();
    
    // 检查DOM中是否真的创建了元素
    setTimeout(() => {
      console.log('检查DOM中的元素:');
      console.log('bg元素:', document.getElementById('bg'));
      console.log('view元素:', document.getElementById('view'));
      console.log('camera元素:', document.getElementById('camera'));
      console.log('floor元素:', document.getElementById('floor'));
      console.log('airplane元素:', document.getElementById('airplane'));
      console.log('star-text元素数量:', document.querySelectorAll('.star-text').length);
      
      // 专门检查bg和view的z-index
      const bgElement = document.getElementById('bg');
      if (bgElement) {
        const bgStyle = window.getComputedStyle(bgElement);
        console.log('bg元素z-index:', bgStyle.zIndex);
      }
      
      const viewElement = document.getElementById('view');
      if (viewElement) {
        const viewStyle = window.getComputedStyle(viewElement);
        console.log('view元素z-index:', viewStyle.zIndex);
        
        // 检查样式是否正确应用
        console.log('view元素计算样式:', {
          width: viewStyle.width,
          height: viewStyle.height,
          position: viewStyle.position,
          perspective: viewStyle.perspective,
          zIndex: viewStyle.zIndex,
          display: viewStyle.display,
          visibility: viewStyle.visibility
        });
      }
      
      // 检查飞机元素
      const airplaneElement = document.getElementById('airplane');
      if (airplaneElement) {
        const computedStyle = window.getComputedStyle(airplaneElement);
        console.log('airplane元素计算样式:', {
          width: computedStyle.width,
          height: computedStyle.height,
          position: computedStyle.position,
          top: computedStyle.top,
          left: computedStyle.left,
          zIndex: computedStyle.zIndex,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          transform: computedStyle.transform,
          animation: computedStyle.animation
        });
        
        // 检查飞机是否有子元素
        console.log('airplane子元素数量:', airplaneElement.children.length);
        console.log('airplane子元素:', Array.from(airplaneElement.children).map(el => el.className));
      }
      
      // 检查地板元素
      const floorElement = document.getElementById('floor');
      if (floorElement) {
        const computedStyle = window.getComputedStyle(floorElement);
        console.log('floor元素计算样式:', {
          width: computedStyle.width,
          height: computedStyle.height,
          position: computedStyle.position,
          backgroundImage: computedStyle.backgroundImage,
          backgroundSize: computedStyle.backgroundSize,
          transform: computedStyle.transform,
          animation: computedStyle.animation
        });
      }
    }, 1000);
    
    // 返回清理函数
    return () => {
      // 清理文字元素
      const floorElements = document.getElementsByClassName(styles.floor);
      if (floorElements.length === 0) return;
      
      const floor = floorElements[0];
      const existingTexts = floor.querySelectorAll('.star-text');
      existingTexts.forEach(text => text.remove());
      
      // 清理3D结构
      const bg = document.getElementById('bg');
      const view = document.getElementById('view');
      if (bg) bg.remove();
      if (view) view.remove();
      
      console.log('清理3D结构和文字元素');
    };
  }