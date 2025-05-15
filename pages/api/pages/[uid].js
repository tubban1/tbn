import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const { uid } = req.query;
  
  try {
    // GET 请求 - 获取页面
    if (req.method === 'GET') {
      const rows = await query(
        'SELECT * FROM pages WHERE uid = ?',
        [uid]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '页面不存在' });
      }
      
      res.status(200).json(rows[0]);
    }
    // PUT 请求 - 更新页面
    else if (req.method === 'PUT') {
      const { title, content, password } = req.body;
      
      // 验证密码
      const rows = await query(
        'SELECT password FROM pages WHERE uid = ?',
        [uid]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '页面不存在' });
      }
      
      if (rows[0].password !== password) {
        return res.status(403).json({ error: '密码错误' });
      }
      
      // 更新页面
      await query(
        'UPDATE pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE uid = ?',
        [title, content, uid]
      );
      
      res.status(200).json({ success: true });
    }
    // PATCH 请求 - 更新页面状态
    else if (req.method === 'PATCH') {
      const { is_assigned, is_sold } = req.body;
      
      // 构建更新语句
      let updateFields = [];
      let updateValues = [];
      
      if (is_assigned !== undefined) {
        updateFields.push('is_assigned = ?');
        updateValues.push(is_assigned);
      }
      
      if (is_sold !== undefined) {
        updateFields.push('is_sold = ?');
        updateValues.push(is_sold);
      }
      
      // 如果没有要更新的字段
      if (updateFields.length === 0) {
        return res.status(400).json({ error: '没有提供要更新的字段' });
      }
      
      // 添加更新时间
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      // 执行更新
      const queryStr = `UPDATE pages SET ${updateFields.join(', ')} WHERE uid = ?`;
      updateValues.push(uid);
      
      const result = await query(queryStr, updateValues);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '页面不存在' });
      }
      
      res.status(200).json({ success: true });
    }
    else {
      res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('操作失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}