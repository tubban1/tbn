import { query } from '../../lib/db';

export default async function handler(req, res) {
  try {
    // 检查 comments 表是否存在 author 字段，如果不存在则添加
    const columns = await query(`
      SHOW COLUMNS FROM comments LIKE 'author'
    `);
    
    if (columns.length === 0) {
      // 添加 author 字段
      await query(`
        ALTER TABLE comments 
        ADD COLUMN author VARCHAR(255) DEFAULT '匿名' AFTER page_uid
      `);
    }
    
    res.status(200).json({ message: 'comments表结构更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}