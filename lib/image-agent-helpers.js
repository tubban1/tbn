import axios from 'axios';
import FormData from 'form-data';
import OSS from 'ali-oss';
import { isPostgresMode, query } from './db';
import { ensureTbnUserTables } from './tbn_user';

function buildAliyunPublicUrl(objectName, fallbackUrl) {
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${objectName}`;
  }
  return fallbackUrl?.replace(/^http:\/\//, 'https://');
}

function sanitizeOssFilename(filename) {
  const safeName = (filename || 'image.png')
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeName || 'image.png';
}

// Ensure tables exist in the database
export async function ensureCreditsTables() {
  await ensureTbnUserTables();

  if (isPostgresMode) return;

  await query(`CREATE TABLE IF NOT EXISTS tbn_user_credits (
    email VARCHAR(255) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await query(`CREATE TABLE IF NOT EXISTS credit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    description VARCHAR(255) NULL,
    stripe_payment_id VARCHAR(255) NULL,
    stripe_session_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

export async function ensureDrawImagesTable() {
  if (isPostgresMode) return;

  await query(`CREATE TABLE IF NOT EXISTS draw_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    sketch_url VARCHAR(500) NOT NULL,
    generated_url VARCHAR(500) NOT NULL,
    display_url VARCHAR(500) NULL,
    style VARCHAR(50) NOT NULL,
    prompt TEXT NULL,
    prompt_en TEXT NULL,
    prompt_zh TEXT NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await query(`
  CREATE TABLE IF NOT EXISTS temp_image_data (
    draw_image_id INT PRIMARY KEY,
    input_base64 LONGTEXT,
    output_base64 LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draw_image_id) REFERENCES draw_images(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

export async function saveDrawImagePair(
  email,
  sketchUrl,
  generatedUrl,
  displayUrl,
  style,
  prompt = null,
  prompt_en = null,
  prompt_zh = null,
  description = null
) {
  await ensureDrawImagesTable();
  const insertResult = await query(
    'INSERT INTO draw_images (email, sketch_url, generated_url, display_url, style, prompt, prompt_en, prompt_zh, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [email, sketchUrl, generatedUrl, displayUrl, style, prompt, prompt_en, prompt_zh, description]
  );

  const insertId = insertResult?.insertId;
  if (!insertId) {
    throw new Error('[saveDrawImagePair] Failed to get insertId from database');
  }

  const rows = await query('SELECT * FROM draw_images WHERE id = ? LIMIT 1', [insertId]);
  return rows[0];
}

// Calculate credits based on image dimensions
export function calculateCreditsForSize(size) {
  if (!size) return 8;
  const [w, h] = size.split('x').map(Number);
  if (w && h) {
    const pixels = w * h;
    if (pixels >= 16000000) { // e.g. 4096x4096
      return 25;
    } else if (pixels >= 3000000) { // e.g. 1536x2688 (4.1M), 2048x2048 (4.1M)
      return 25;
    }
  }
  return 8;
}

// Upload base64 image data to Aliyun OSS
export async function uploadToAliyun(
  base64Data,
  filename,
  mimeType = 'image/png'
) {
  try {
    console.log('[Aliyun OSS Upload] Starting upload to Aliyun OSS:', { filename });
    if (!base64Data) {
      throw new Error('Image base64 data is empty');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    if (!process.env.ALIYUN_OSS_REGION || !process.env.ALIYUN_OSS_ACCESS_KEY_ID || !process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || !process.env.ALIYUN_OSS_BUCKET) {
      throw new Error('Aliyun OSS environment variables are missing');
    }

    const client = new OSS({
      region: process.env.ALIYUN_OSS_REGION,
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
      bucket: process.env.ALIYUN_OSS_BUCKET,
      secure: true,
      timeout: '30s',
    });

    const uniqueFilename = `images/${Date.now()}_${sanitizeOssFilename(filename)}`;
    const result = await client.put(uniqueFilename, buffer, {
      headers: {
        'Content-Type': mimeType,
      }
    });
    const publicUrl = buildAliyunPublicUrl(uniqueFilename, result.url);

    console.log(`[Aliyun OSS Upload] ✅ Image uploaded successfully to Aliyun: ${publicUrl}`);
    return {
      url: publicUrl,
      displayUrl: publicUrl,
      viewerUrl: publicUrl,
      imageId: uniqueFilename,
    };
  } catch (error) {
    console.error('[Aliyun OSS Upload] Upload failed - details:', error?.message);
    throw error;
  }
}

// Upload base64 image data to Freeimage.host
export async function uploadToFreeimageHost(
  base64Data,
  filename,
  mimeType = 'image/png'
) {
  const apiKey = process.env.FREEIMAGE_HOST_API_KEY || '6d207e02198a847aa98d0a2a901485a5';

  try {
    console.log('[Freeimage Upload] Starting upload to Freeimage.host:', { 
      filename, 
      base64Length: base64Data.length,
      apiKey: apiKey.substring(0, 8) + '...'
    });

    const buffer = Buffer.from(base64Data, 'base64');
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('action', 'upload');
    formData.append('format', 'json');
    formData.append('source', buffer, {
      filename: filename || 'image.png',
      contentType: mimeType || 'image/png',
    });

    const response = await axios.post(
      'https://freeimage.host/api/1/upload',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.status_code === 200 && response.data.success) {
      const imageData = response.data.image;
      
      console.log(`[Freeimage Upload] ✅ Image uploaded successfully: ID = ${imageData.id}`);
      return {
        url: imageData.url,
        displayUrl: imageData.display_url || imageData.url,
        viewerUrl: imageData.url_viewer,
        imageId: imageData.id_encoded || imageData.id?.toString(),
        deleteHash: imageData.storage_id || undefined,
      };
    } else {
      console.error(`[Freeimage Upload] API Error Response:`, JSON.stringify(response.data, null, 2));
      throw new Error(response.data?.status_txt || response.data?.error?.message || JSON.stringify(response.data) || 'Upload failed: unknown error');
    }
  } catch (error) {
    if (error.response) {
      console.error('[Freeimage Upload] HTTP Error Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('[Freeimage Upload] Upload failed - details:', error?.message);
    }
    
    console.warn('[Freeimage Upload] ⚠️ Freeimage upload failed. Falling back to Aliyun OSS...');
    try {
      return await uploadToAliyun(base64Data, filename, mimeType);
    } catch (aliyunError) {
      console.error('[Fallback Upload] Aliyun OSS upload also failed:', aliyunError.message);
      throw new Error(`Freeimage upload failed (${error.message}); Aliyun OSS fallback also failed (${aliyunError.message})`);
    }
  }
}

// Download image from URL and upload to Freeimage.host
export async function processAndUploadImageUrl(url, filename) {
  console.log(`[Image Agent] Downloading generated image from VectorEngine: ${url}`);
  const httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
  const imageResponse = await axios.get(url, { responseType: 'arraybuffer', httpsAgent });
  const base64Data = Buffer.from(imageResponse.data).toString('base64');

  const mimeType = url.includes('.png') ? 'image/png' : 'image/jpeg';
  console.log(`[Image Agent] Uploading downloaded image to Freeimage.host...`);
  try {
    const uploadResult = await uploadToFreeimageHost(base64Data, filename, mimeType);
    return {
      ...uploadResult,
      base64Fallback: `data:${mimeType};base64,${base64Data}`
    };
  } catch (err) {
    err.base64Fallback = `data:${mimeType};base64,${base64Data}`;
    throw err;
  }
}
