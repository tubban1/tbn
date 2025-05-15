import { query } from '../../../lib/db';
import { nanoid } from 'nanoid';

// 生成4位随机密码（数字和字母组合）
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 4; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// 生成祝福语标题
function generateTitle() {
  const greetings = [
    '晚安', '早安', '午安', '新年快乐', '生日快乐', '节日快乐',
    '祝你幸福', '祝你健康', '祝你平安', '祝你快乐', '祝你成功',
    '加油', '一切顺利', '心想事成', '万事如意', '平安喜乐'
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { count = 10 } = req.body;
  
  // 验证数量
  const pageCount = parseInt(count);
  if (isNaN(pageCount) || pageCount < 1 || pageCount > 100) {
    return res.status(400).json({ error: '页面数量必须在1-100之间' });
  }

  try {
    let created = 0;
    
    // 批量创建页面
    for (let i = 0; i < pageCount; i++) {
      const uid = nanoid(8); // 生成8位唯一ID
      const password = generatePassword();
      const title = generateTitle();
      
      await query(
        `INSERT INTO pages (uid, password, title) VALUES (?, ?, ?)`,
        [uid, password, title]
      );
      
      created++;
    }
    
    res.status(200).json({ created });
  } catch (error) {
    console.error('创建页面失败:', error);
    res.status(500).json({ error: '创建页面失败' });
  }
}