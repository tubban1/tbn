import { query } from '../../lib/db';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // 获取所有表名
    const tables = await query(`
      SHOW TABLES
    `);
    
    let markdown = `# 祝福页面系统数据结构文档

## 数据库表结构\n\n`;

    // 遍历每个表，获取其结构
    for (const tableObj of tables) {
      const tableName = tableObj[Object.keys(tableObj)[0]];
      
      // 获取表结构
      const columns = await query(`
        DESCRIBE ${tableName}
      `);
      
      markdown += `### ${tableName} 表\n`;
      
      // 根据表名添加描述
      switch(tableName) {
        case 'pages':
          markdown += '存储祝福页面的基本信息\n\n';
          break;
        case 'styles':
          markdown += '存储自定义CSS样式\n\n';
          break;
        case 'scripts':
          markdown += '存储自定义JavaScript脚本\n\n';
          break;
        case 'comments':
          markdown += '存储页面评论\n\n';
          break;
        case 'page_views':
          markdown += '记录页面访问信息\n\n';
          break;
        default:
          markdown += '\n\n';
      }
      
      // 创建表格头部
      markdown += '| 字段名 | 类型 | 是否为空 | 键 | 默认值 | 额外信息 |\n';
      markdown += '|--------|------|----------|-----|--------|----------|\n';
      
      // 添加每一列的信息
      for (const column of columns) {
        markdown += `| ${column.Field} | ${column.Type} | ${column.Null} | ${column.Key || ''} | ${column.Default !== null ? column.Default : ''} | ${column.Extra || ''} |\n`;
      }
      
      markdown += '\n';
    }
    
    // 添加数据结构说明
    markdown += `## 数据结构

### pages 表 content 字段 JSON 结构
\`\`\`json
{
  "wishText": "祝福文字内容",
  "name": "祝福对象名称",
  "greeting": "问候语",
  "interaction": {
    "type": "互动类型，如like、comment等",
    "config": {}
  },
  "theme": "页面主题名称",
  "matrixTexts": ["黑客帝国主题的自定义文字"]
}
\`\`\`

### comments 表 content 字段结构
\`\`\`json
{
  "author": "评论者名称",
  "text": "评论内容",
  "avatar": "头像URL（可选）"
}
\`\`\`
`;
    
    // 确保目录存在
    const docDir = path.join(process.cwd(), 'doc');
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(
      path.join(process.cwd(), 'doc', 'DataStructure.md'),
      markdown
    );
    
    res.status(200).json({ 
      message: '数据库结构已成功保存到 /doc/DataStructure.md',
      structure: markdown
    });
  } catch (error) {
    console.error('获取数据库结构失败:', error);
    res.status(500).json({ error: error.message });
  }
}