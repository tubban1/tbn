import { query } from '../../lib/db';

export default async function handler(req, res) {
  try {
    // 1. pages 主表
    await query(`
      CREATE TABLE IF NOT EXISTS pages (
        uid VARCHAR(16) PRIMARY KEY,
        password VARCHAR(64) NOT NULL,
        title TEXT,
        content TEXT,
        css_id INT DEFAULT NULL,
        js_id INT DEFAULT NULL,
        is_assigned BOOLEAN DEFAULT FALSE,
        is_sold BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. styles 样式表
    await query(`
      CREATE TABLE IF NOT EXISTS styles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50),
        css_content TEXT
      )
    `);

    // 3. scripts 脚本表
    await query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50),
        js_content TEXT
      )
    `);

    // 4. comments 留言表
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        page_uid VARCHAR(16),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (page_uid) REFERENCES pages(uid) ON DELETE CASCADE
      )
    `);

    // 5. page_views 页面访问记录表
    await query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INT PRIMARY KEY AUTO_INCREMENT,
        page_uid VARCHAR(16),
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        FOREIGN KEY (page_uid) REFERENCES pages(uid) ON DELETE CASCADE
      )
    `);

    res.status(200).json({ message: '所有表已成功创建' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}