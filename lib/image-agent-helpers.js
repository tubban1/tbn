import axios from 'axios';
import FormData from 'form-data';
import { query } from './db';

// Ensure tables exist in the database
export async function ensureCreditsTables() {
  await query(`CREATE TABLE IF NOT EXISTS user_credits (
    email VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL DEFAULT '12345688',
    credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  try {
    await query(`ALTER TABLE user_credits ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '12345688' AFTER email;`);
  } catch (err) {
    // Column might already exist, ignore
  }

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
    throw error;
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
