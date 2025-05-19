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
    
    // 更新所有页面的默认主题为 matrix
    // 1. 处理 content 字段中 theme 为 "default" 的情况
    await query(`
      UPDATE pages 
      SET content = JSON_SET(
        content, 
        '$.theme', 
        'matrix'
      )
      WHERE JSON_EXTRACT(content, '$.theme') = 'default' OR JSON_EXTRACT(content, '$.theme') IS NULL
    `);
    
    // 2. 处理 theme 字段为 "default" 的情况（如果有单独的 theme 字段）
    const themeColumn = await query(`
      SHOW COLUMNS FROM pages LIKE 'theme'
    `);
    
    if (themeColumn.length > 0) {
      await query(`
        UPDATE pages 
        SET theme = 'matrix' 
        WHERE theme = 'default' OR theme IS NULL
      `);
    }
    
    res.status(200).json({ 
      message: 'comments表结构更新成功，并且所有默认主题已更新为matrix' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}