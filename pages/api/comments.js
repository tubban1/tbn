import { query } from '../../lib/db';

export default async function handler(req, res) {
  // 获取评论列表
  if (req.method === 'GET') {
    const { page_uid } = req.query;
    
    if (!page_uid) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    try {
      const comments = await query(
        'SELECT * FROM comments WHERE page_uid = ? ORDER BY created_at DESC',
        [page_uid]
      );
      
      return res.status(200).json(comments);
    } catch (error) {
      console.error('获取评论失败:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }
  
  // 添加新评论
  if (req.method === 'POST') {
    const { page_uid, author, content } = req.body;
    
    if (!page_uid || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    try {
      const result = await query(
        'INSERT INTO comments (page_uid, author, content, created_at) VALUES (?, ?, ?, NOW())',
        [page_uid, author || '匿名', content]
      );
      
      const newComment = {
        id: result.insertId,
        page_uid,
        author: author || '匿名',
        content,
        created_at: new Date().toISOString()
      };
      
      return res.status(201).json(newComment);
    } catch (error) {
      console.error('添加评论失败:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }
  
  // 不支持的请求方法
  return res.status(405).json({ error: '不支持的请求方法' });
}