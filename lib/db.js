import mysql from 'serverless-mysql';

const dbConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD
};

// 保持原有导出的兼容性，同时提供一个可以热重建的 activeDb
export const db = mysql({ config: dbConfig });
let activeDb = db;

// 精准甄别哪些底层错误属于连接/网络抖动（需要重试），哪些属于语法/业务逻辑错误（无需重试）
function shouldRetry(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';

  // 1. 明确的业务/语法级错误，严禁重试
  const nonRetryCodes = [
    'ER_DUP_FIELDNAME',      // Duplicate column name
    'ER_TABLE_EXISTS_ERROR', // Table already exists
    'ER_DUP_ENTRY',          // Duplicate entry (e.g. Unique key constraint)
    'ER_BAD_FIELD_ERROR',    // Unknown column
    'ER_NO_SUCH_TABLE',      // Table doesn't exist
    'ER_PARSE_ERROR',        // Syntax error
    'ER_DATA_TOO_LONG',      // Data too long
    'ER_NO_REFERENCED_ROW',  // Foreign key constraint failed
    'ER_NO_REFERENCED_ROW_2'
  ];
  if (nonRetryCodes.includes(code)) {
    return false;
  }

  // 2. 明确的连接与网络丢失类错误，应当重试
  const retryCodes = [
    'PROTOCOL_CONNECTION_LOST',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'EPIPE',
    'ER_CON_COUNT_ERROR'
  ];
  if (retryCodes.includes(code)) {
    return true;
  }

  // 3. 模糊匹配可能包含的网络/连接超时/状态关闭相关的信息
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('closed state') ||
    lowerMsg.includes('connection') ||
    lowerMsg.includes('econn') ||
    lowerMsg.includes('etimedout')
  ) {
    return true;
  }

  return false;
}

export async function query(q, values) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const results = await activeDb.query(q, values);
      return results;
    } catch (error) {
      lastError = error;
      
      // 如果属于业务或语法类报错，无需重试，立即向上抛出以提高响应效率
      if (!shouldRetry(error)) {
        throw error;
      }
      
      console.warn(`[Database query] Attempt ${attempt} failed (will retry): ${error.message || error}`);
      
      // 自愈重构：一旦检测到连接已关闭或超时断开，立刻抛弃坏池，重新配置健康的新 client 池！
      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('closed state') || errMsg.includes('connection') || error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn(`[Database query] Detected dead pool state "${error.message}". Re-initializing active client pool via quit().`);
        try {
          activeDb.quit(); // 清空并重置底层私有 pool 变量为 null
        } catch (e) {}
        activeDb = mysql({ config: dbConfig });
      }
      
      if (attempt < maxRetries) {
        // 退避延迟：300ms、600ms
        const delay = attempt * 300;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}