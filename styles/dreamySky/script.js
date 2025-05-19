/**
 * 梦幻星空主题特效脚本
 * 用于在星空背景中显示用户自定义文字
 */

// 创建梦幻星空特效
export function createDreamySkyEffect(styles, content) {
    // 确保有内容对象
    if (!content) return () => {};
    
    // 获取dreamySkyTexts数组，如果不存在则使用空数组
    let dreamySkyTexts = content.dreamySkyTexts || [];
    
    // 如果文字太少，可以添加一些通用的梦幻词汇或复制现有文字
    if (dreamySkyTexts.length < 10) {
      const defaultTexts = ['梦想', '希望', '未来', '星辰', '宇宙', '光芒', '璀璨', '无限', '飞翔', '自由'];
      
      // 如果用户提供了文字，则复制这些文字；否则使用默认文字
      if (dreamySkyTexts.length > 0) {
        // 复制现有文字直到达到至少20个
        while (dreamySkyTexts.length < 20) {
          dreamySkyTexts = [...dreamySkyTexts, ...dreamySkyTexts];
        }
        // 截取前20个
        dreamySkyTexts = dreamySkyTexts.slice(0, 20);
      } else {
        dreamySkyTexts = defaultTexts;
      }
    }
    
    // 创建3D飞机动画结构
    const createSkyStructure = () => {
      // 检查是否已存在结构
      if (document.getElementById('bg') || document.getElementById('view')) {
        return;
      }
      
      // 获取容器元素 - 修改为更通用的选择器
      const container = document.querySelector(`.${styles.container}`) || document.querySelector('.container') || document.querySelector(`.${styles.dreamSkyPreview}`) || document.body;
      
      if (!container) {
        return;
      }
      
      // 创建背景元素
      const bg = document.createElement('div');
      bg.id = 'bg';
      bg.className = styles.bgElement;
      container.appendChild(bg);
      
      // 创建视图元素
      const view = document.createElement('div');
      view.id = 'view';
      view.className = styles.view;
      container.appendChild(view);
      
      // 创建相机元素
      const camera = document.createElement('div');
      camera.id = 'camera';
      camera.className = styles.camera;
      view.appendChild(camera);
      
      // 创建地板元素
      const floor = document.createElement('div');
      floor.id = 'floor';
      floor.className = styles.floor;
      camera.appendChild(floor);
      
      // 创建飞机元素
      const airplane = document.createElement('div');
      airplane.id = 'airplane';
      airplane.className = styles.airplane;
      camera.appendChild(airplane);
      
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
      
      // 创建飞机组件 - 机身左侧
      const bodyLeft = document.createElement('div');
      bodyLeft.className = styles.bodyLeft;
      airplane.appendChild(bodyLeft);
      
      // 创建飞机组件 - 机身右侧
      const bodyRight = document.createElement('div');
      bodyRight.className = styles.bodyRight;
      airplane.appendChild(bodyRight);
      
      // 创建机身阴影
      const bodyShadow = document.createElement('div');
      bodyShadow.className = styles.bodyShadow;
      airplane.appendChild(bodyShadow);
      
      // 创建喷气效果
      const cloud = document.createElement('div');
      cloud.className = styles.cloud;
      airplane.appendChild(cloud);
      
      // 创建喷气阴影
      const cloudShadow = document.createElement('div');
      cloudShadow.className = styles.cloudShadow;
      airplane.appendChild(cloudShadow);
      
      // 创建飞机机身
      const body = document.createElement('div');
      body.className = styles.airplaneBody;
      airplane.appendChild(body);
      
      // 创建飞机尾翼 - 放在camera中而不是airplane中
      const tail = document.createElement('div');
      tail.className = styles.airplaneTail;
      tail.id = 'airplaneTail';
      camera.appendChild(tail); // 添加到camera而不是airplane
      
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
      
      // 添加尾部跟随动画
      tail.animate(
        [
          { transform: 'translateY(-8px) translateZ(190px) rotateX(4deg) rotateY(2deg)' },
          { transform: 'translateY(2px) translateZ(190px) rotateX(-4deg) rotateY(-2deg)' },
          { transform: 'translateY(-8px) translateZ(190px) rotateX(4deg) rotateY(2deg)' }
        ],
        {
          duration: 6000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
    };
    
    // 创建星空文字元素
    const createStarTexts = () => {
      // 获取floor元素，用于放置文字
      const floorElements = document.getElementsByClassName(styles.floor);
      if (floorElements.length === 0) {
        return;
      }
      
      const floor = floorElements[0];
      
      // 清除已有的文字元素
      const existingTexts = floor.querySelectorAll('.star-text');
      existingTexts.forEach(text => text.remove());
      
      // 为每个文字创建元素并添加到floor上
      dreamySkyTexts.forEach((text, index) => {
        const textElement = document.createElement('div');
        textElement.className = `star-text ${styles.starText}`;
        textElement.textContent = text;
        
        // 设置随机大小 (16px - 32px)
        const fontSize = 16 + Math.floor(Math.random() * 16);
        textElement.style.fontSize = `${fontSize}px`;
        
        // 设置基础透明度 (0.6 - 1.0)
        const baseOpacity = 0.6 + Math.random() * 0.4;
        
        // 计算文字位置 - 使用更均匀的分布
        // 将floor区域分成一个网格，确保文字均匀分布
        const totalTexts = dreamySkyTexts.length;
        const gridSize = Math.ceil(Math.sqrt(totalTexts)); // 计算网格大小
        const cellWidth = 1600 / gridSize;
        const cellHeight = 1600 / gridSize;
        
        // 计算当前文字应该在的网格位置
        const gridX = index % gridSize;
        const gridY = Math.floor(index / gridSize);
        
        // 在网格单元内添加一些随机偏移，避免文字完全对齐
        const offsetX = Math.random() * cellWidth * 0.8;
        const offsetY = Math.random() * cellHeight * 0.8;
        
        // 设置最终位置
        textElement.style.left = `${gridX * cellWidth + offsetX}px`;
        textElement.style.top = `${gridY * cellHeight + offsetY}px`;
        textElement.style.transform = 'translateZ(-600px)';
        
        // 添加动画 - 修改透明度范围
        textElement.animate(
          [
            { opacity: 0, transform: 'translateZ(-650px)' },
            { opacity: baseOpacity, transform: 'translateZ(-600px)' },
            { opacity: 0, transform: 'translateZ(-550px)' }
          ],
          {
            duration: 8000 + (index * 1000),
            iterations: Infinity,
            delay: index * 1000, // 减少延迟，让文字更快出现
            easing: 'ease-in-out'
          }
        );
        
        floor.appendChild(textElement);
      });
    };
    
    // 初始创建3D结构
    createSkyStructure();
    
    // 初始创建文字
    createStarTexts();
    
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
    };
  }