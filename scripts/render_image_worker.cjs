const fs = require('fs');
const path = require('path');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const OSS = require('ali-oss');
const { Pool } = require('pg');

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) return;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  });
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function getConnectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''
  );
}

const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: parseInt(process.env.WORKER_POSTGRES_POOL_MAX || '3', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('[Render Image Worker] Postgres pool error:', error.message);
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeFilename(filename) {
  return (filename || 'image.png')
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';
}

function hasAliyunConfig() {
  return Boolean(
    process.env.ALIYUN_OSS_REGION &&
    process.env.ALIYUN_OSS_ACCESS_KEY_ID &&
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET &&
    process.env.ALIYUN_OSS_BUCKET
  );
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS image_generation_tasks (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      task_type TEXT NOT NULL DEFAULT 'text-to-image',
      status TEXT NOT NULL DEFAULT 'pending',
      request_payload TEXT NOT NULL,
      result_payload TEXT NULL,
      error_message TEXT NULL,
      credits_cost INTEGER NOT NULL DEFAULT 0,
      draw_image_id INTEGER NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_image_generation_tasks_status ON image_generation_tasks(status, created_at);
  `);
}

async function claimTask() {
  const result = await pool.query(`
    WITH next_task AS (
      SELECT id
      FROM image_generation_tasks
      WHERE
        status = 'pending'
        OR (status = 'processing' AND locked_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes' AND attempts < 3)
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE image_generation_tasks t
    SET status = 'processing',
        locked_at = CURRENT_TIMESTAMP,
        attempts = attempts + 1
    FROM next_task
    WHERE t.id = next_task.id
    RETURNING t.*;
  `);
  return result.rows[0] || null;
}

async function uploadToAliyun(base64Data, filename, mimeType) {
  if (!process.env.ALIYUN_OSS_REGION || !process.env.ALIYUN_OSS_ACCESS_KEY_ID || !process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || !process.env.ALIYUN_OSS_BUCKET) {
    throw new Error('Aliyun OSS is not configured');
  }

  const client = new OSS({
    region: process.env.ALIYUN_OSS_REGION,
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALIYUN_OSS_BUCKET,
    secure: true,
    timeout: '30s'
  });

  const objectName = `images/${Date.now()}_${sanitizeFilename(filename)}`;
  const result = await client.put(objectName, Buffer.from(base64Data, 'base64'), {
    headers: { 'Content-Type': mimeType }
  });
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
  const url = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${objectName}`
    : result.url.replace(/^http:\/\//, 'https://');

  return { url, displayUrl: url };
}

async function uploadToFreeimageHost(base64Data, filename, mimeType) {
  const apiKey = process.env.FREEIMAGE_HOST_API_KEY;
  const uploadProvider = (process.env.IMAGE_UPLOAD_PROVIDER || '').toLowerCase();
  const shouldPreferAliyun = uploadProvider === 'aliyun' || (!uploadProvider && hasAliyunConfig());
  let freeimageError = null;

  if (shouldPreferAliyun) {
    try {
      console.log('[Render Image Worker] Uploading image to Aliyun OSS...');
      const result = await uploadToAliyun(base64Data, filename, mimeType);
      return { ...result, isPermanent: true };
    } catch (aliyunFirstError) {
      console.warn('[Render Image Worker] Aliyun upload failed, trying Freeimage fallback:', aliyunFirstError.message);
      freeimageError = aliyunFirstError;
    }
  }

  if (apiKey) {
    try {
      const formData = new FormData();
      formData.append('key', apiKey);
      formData.append('action', 'upload');
      formData.append('format', 'json');
      formData.append('source', Buffer.from(base64Data, 'base64'), {
        filename: filename || 'image.png',
        contentType: mimeType || 'image/png'
      });

      const response = await axios.post('https://freeimage.host/api/1/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 30000
      });

      if (response.data?.status_code === 200 && response.data?.success) {
        const imageData = response.data.image;
        return {
          url: imageData.url,
          displayUrl: imageData.display_url || imageData.url,
          isPermanent: true
        };
      }

      throw new Error(response.data?.status_txt || 'Freeimage upload failed');
    } catch (error) {
      freeimageError = error;
      console.warn('[Render Image Worker] Freeimage upload failed:', error.message);
    }
  } else {
    freeimageError = new Error('FREEIMAGE_HOST_API_KEY is not configured');
  }

  try {
    if (shouldPreferAliyun) {
      throw freeimageError;
    }
    console.warn('[Render Image Worker] Trying Aliyun OSS fallback...');
    const result = await uploadToAliyun(base64Data, filename, mimeType);
    return { ...result, isPermanent: true };
  } catch (aliyunError) {
    console.warn('[Render Image Worker] Aliyun upload failed, using temporary base64 fallback:', aliyunError.message);
    return {
      url: `data:${mimeType || 'image/png'};base64,${base64Data}`,
      displayUrl: `data:${mimeType || 'image/png'};base64,${base64Data}`,
      isPermanent: false,
      uploadError: `${freeimageError?.message || 'Freeimage unavailable'}; ${aliyunError.message}`
    };
  }
}

async function processAndUploadImageUrl(url, filename) {
  const imageResponse = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const base64Data = Buffer.from(imageResponse.data).toString('base64');
  const mimeType = url.includes('.png') ? 'image/png' : 'image/jpeg';
  return uploadToFreeimageHost(base64Data, filename, mimeType);
}

async function generateImage(payload) {
  const apiKey = process.env.VECTORENGINE_API_KEY;
  if (!apiKey) {
    throw new Error('VECTORENGINE_API_KEY is not configured');
  }

  const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
  const model = process.env.IMAGE_MODEL || 'gpt-image-2';
  const format = payload.format || 'jpeg';
  const requestPayload = {
    model,
    prompt: payload.prompt,
    n: 1,
    format
  };

  if (payload.size) requestPayload.size = payload.size;
  if (payload.quality) requestPayload.quality = payload.quality;

  const modelTimeout = parseInt(process.env.IMAGE_WORKER_MODEL_TIMEOUT || '900000', 10);
  console.log('[Render Image Worker] Calling VectorEngine image model:', {
    model,
    size: payload.size || 'omitted',
    timeoutMs: modelTimeout
  });

  const response = await axios.post(`${apiBase}/images/generations`, requestPayload, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: modelTimeout
  });

  const firstImage = response.data?.data?.[0];
  if (!firstImage) {
    throw new Error('No image data returned from VectorEngine');
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  if (firstImage.b64_json) {
    return uploadToFreeimageHost(firstImage.b64_json, `generated_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`, mimeType);
  }

  if (firstImage.url) {
    try {
      return await processAndUploadImageUrl(firstImage.url, `generated_${Date.now()}.png`);
    } catch (error) {
      console.warn('[Render Image Worker] Permanent upload failed; using model URL:', error.message);
      return { url: firstImage.url, displayUrl: firstImage.url };
    }
  }

  throw new Error('Invalid image format returned from VectorEngine');
}

async function editImage(payload) {
  const apiKey = process.env.VECTORENGINE_API_KEY;
  if (!apiKey) {
    throw new Error('VECTORENGINE_API_KEY is not configured');
  }

  if (!payload.images || !payload.images.length) {
    throw new Error('No input images provided for edit task');
  }

  const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
  const model = process.env.IMAGE_MODEL || 'gpt-image-2';
  const formData = new FormData();
  formData.append('model', model);
  formData.append('prompt', payload.prompt);
  if (payload.size) formData.append('size', payload.size);
  formData.append('n', payload.n || '1');

  payload.images.forEach((image, index) => {
    formData.append('image', Buffer.from(image.base64, 'base64'), {
      filename: image.filename || `image_${index}.png`,
      contentType: image.mimeType || 'image/png'
    });
  });

  const modelTimeout = parseInt(process.env.IMAGE_WORKER_MODEL_TIMEOUT || '900000', 10);
  console.log('[Render Image Worker] Calling VectorEngine edit model:', {
    model,
    filesCount: payload.images.length,
    size: payload.size || 'omitted',
    timeoutMs: modelTimeout
  });

  const response = await axios.post(`${apiBase}/images/edits`, formData, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders()
    },
    timeout: modelTimeout
  });

  const firstImage = response.data?.data?.[0];
  if (!firstImage) {
    throw new Error('No edited image data returned from VectorEngine');
  }

  if (firstImage.b64_json) {
    return uploadToFreeimageHost(firstImage.b64_json, `edited_${Date.now()}.png`, 'image/png');
  }

  if (firstImage.url) {
    try {
      return await processAndUploadImageUrl(firstImage.url, `edited_${Date.now()}.png`);
    } catch (error) {
      console.warn('[Render Image Worker] Permanent edit upload failed; using model URL:', error.message);
      return { url: firstImage.url, displayUrl: firstImage.url };
    }
  }

  throw new Error('Invalid edited image format returned from VectorEngine');
}

async function saveCompletedTask(task, payload, imageResult) {
  const placeholderUrl = 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Generated';
  const dbGeneratedUrl = imageResult.isPermanent === false ? placeholderUrl : imageResult.url;
  const dbDisplayUrl = imageResult.isPermanent === false ? placeholderUrl : imageResult.displayUrl;
  const isEditTask = task.task_type === 'image-edit';
  const inputImage = payload.images?.[0];
  const dbInputUrl = isEditTask && inputImage
    ? `data:${inputImage.mimeType || 'image/png'};base64,${inputImage.base64}`
    : 'text-to-image';
  const dbSketchUrl = dbInputUrl.startsWith('data:') && dbInputUrl.length > 500
    ? 'error:input_base64_too_long'
    : dbInputUrl;

  const drawResult = await pool.query(
    `INSERT INTO draw_images
      (email, sketch_url, generated_url, display_url, style, prompt, prompt_en, prompt_zh, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      task.email,
      dbSketchUrl,
      dbGeneratedUrl,
      dbDisplayUrl,
      isEditTask ? 'edit' : 'text',
      payload.prompt,
      payload.prompt_en || payload.prompt,
      payload.prompt_zh || payload.prompt,
      payload.description || null
    ]
  );

  const drawImageId = drawResult.rows[0]?.id || null;
  const resultPayload = {
    originalUrl: imageResult.url,
    freeimageUrl: imageResult.displayUrl,
    drawImageId,
    prompt: payload.prompt,
    size: payload.size || null,
    isTemporary: imageResult.isPermanent === false,
    uploadError: imageResult.uploadError || null
  };

  await pool.query(
    `INSERT INTO credit_transactions (email, type, amount, balance_after, description)
     VALUES ($1, $2, $3, (SELECT credits FROM tbn_user_credits WHERE email = $1), $4)`,
    [task.email, 'consume', -Number(task.credits_cost || 0), isEditTask ? 'Image editing' : 'Image generation']
  );

  await pool.query(
    `UPDATE image_generation_tasks
     SET status = 'completed',
         result_payload = $2,
         draw_image_id = $3,
         error_message = NULL
     WHERE id = $1`,
    [task.id, JSON.stringify(resultPayload), drawImageId]
  );
}

async function failTask(task, error) {
  let message = error?.response?.data?.error?.message || error?.message || 'Image generation failed';
  if (error?.code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(message)) {
    message = '图片模型生成超时，本次额度已自动退回。请降低图片尺寸或稍后重试。';
  } else if (error?.response?.status === 429 || /429|rate limit|too many/i.test(message)) {
    message = '图片模型当前请求过多，本次额度已自动退回。请稍后重试或减少批量数量。';
  }
  console.error(`[Render Image Worker] Task ${task.id} failed:`, message);

  await pool.query('UPDATE tbn_user_credits SET credits = credits + $1 WHERE email = $2', [
    Number(task.credits_cost || 0),
    task.email
  ]);

  await pool.query(
    `UPDATE image_generation_tasks
     SET status = 'failed',
         error_message = $2
     WHERE id = $1`,
    [task.id, message]
  );
}

async function processTask(task) {
  const payload = JSON.parse(task.request_payload);
  console.log(`[Render Image Worker] Processing ${task.id} for ${task.email}`);
  const imageResult = task.task_type === 'image-edit'
    ? await editImage(payload)
    : await generateImage(payload);
  await saveCompletedTask(task, payload, imageResult);
  console.log(`[Render Image Worker] Completed ${task.id}`);
}

async function workerLoop() {
  await ensureSchema();
  console.log('[Render Image Worker] Started.');

  while (true) {
    try {
      const task = await claimTask();
      if (!task) {
        await sleep(parseInt(process.env.IMAGE_WORKER_POLL_INTERVAL || '3000', 10));
        continue;
      }

      try {
        await processTask(task);
      } catch (error) {
        await failTask(task, error);
      }
    } catch (error) {
      console.error('[Render Image Worker] Loop error:', error.message);
      await sleep(5000);
    }
  }
}

const port = parseInt(process.env.PORT || '10000', 10);
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'render-image-worker' }));
}).listen(port, () => {
  console.log(`[Render Image Worker] Health server listening on ${port}`);
});

process.on('SIGTERM', async () => {
  console.log('[Render Image Worker] SIGTERM received, closing pool.');
  await pool.end();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  if (error?.code === 'EPIPE') {
    console.warn('[Render Image Worker] Ignored socket EPIPE:', error.message);
    return;
  }
  console.error('[Render Image Worker] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  if (error?.code === 'EPIPE') {
    console.warn('[Render Image Worker] Ignored unhandled EPIPE:', error.message);
    return;
  }
  console.error('[Render Image Worker] Unhandled rejection:', error);
});

workerLoop();
