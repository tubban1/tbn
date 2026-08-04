import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { query } from './db';
import {
  getImageModelConfig,
  processAndUploadImageUrl,
  uploadToFreeimageHost,
  saveDrawImagePair
} from './image-agent-helpers';

function normalizeImageError(error) {
  let message = error?.response?.data?.error?.message || error?.message || 'Image generation failed';
  if (error?.code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(message)) {
    message = '图片模型生成超时，本次额度已自动退回。请降低图片尺寸或稍后重试。';
  } else if (error?.response?.status === 429 || /429|rate limit|too many|请求过多/i.test(message)) {
    message = '图片模型当前请求过多，本次额度已自动退回。请稍后重试或减少批量数量。';
  }
  return message;
}

async function uploadGeneratedImage(firstImage, format) {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

  if (firstImage.b64_json) {
    return uploadToFreeimageHost(firstImage.b64_json, `generated_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`, mimeType);
  }

  if (firstImage.url) {
    try {
      return await processAndUploadImageUrl(firstImage.url, `generated_${Date.now()}.png`);
    } catch (error) {
      console.warn('[Image Task Processor] Permanent upload failed; using model URL:', error.message);
      return { url: firstImage.url, displayUrl: firstImage.url };
    }
  }

  throw new Error('Invalid image format returned from image model');
}

async function generateImage(payload) {
  const modelConfig = getImageModelConfig(payload.model || 'standard');
  if (!modelConfig.apiKey) {
    throw new Error('Image generation API key is not configured');
  }

  const format = payload.format || 'jpeg';
  const requestPayload = {
    model: modelConfig.model,
    prompt: payload.prompt,
    n: 1,
    format
  };
  if (payload.size) requestPayload.size = payload.size;
  if (payload.quality) requestPayload.quality = payload.quality;

  console.log('[Image Task Processor] Calling image generation model:', {
    model: modelConfig.model,
    modelSlot: payload.model || 'standard',
    size: payload.size || 'omitted'
  });

  const response = await axios.post(`${modelConfig.apiBase}/images/generations`, requestPayload, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${modelConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: parseInt(process.env.VERCEL_IMAGE_MODEL_TIMEOUT || '280000', 10),
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  });

  const firstImage = response.data?.data?.[0];
  if (!firstImage) {
    throw new Error('No image data returned from image model');
  }

  return uploadGeneratedImage(firstImage, format);
}

async function editImage(payload) {
  const modelConfig = getImageModelConfig(payload.model || 'standard');
  if (!modelConfig.apiKey) {
    throw new Error('Image edit API key is not configured');
  }
  if (!payload.images?.length) {
    throw new Error('No input images provided for edit task');
  }

  const formData = new FormData();
  formData.append('model', modelConfig.model);
  formData.append('prompt', payload.prompt);
  if (payload.size) formData.append('size', payload.size);
  formData.append('n', payload.n || '1');

  payload.images.forEach((image, index) => {
    formData.append('image', Buffer.from(image.base64, 'base64'), {
      filename: image.filename || `image_${index}.png`,
      contentType: image.mimeType || 'image/png'
    });
  });

  console.log('[Image Task Processor] Calling image edit model:', {
    model: modelConfig.model,
    modelSlot: payload.model || 'standard',
    filesCount: payload.images.length,
    size: payload.size || 'omitted'
  });

  const response = await axios.post(`${modelConfig.apiBase}/images/edits`, formData, {
    headers: {
      Authorization: `Bearer ${modelConfig.apiKey}`,
      ...formData.getHeaders()
    },
    timeout: parseInt(process.env.VERCEL_IMAGE_MODEL_TIMEOUT || '280000', 10),
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  });

  const firstImage = response.data?.data?.[0];
  if (!firstImage) {
    throw new Error('No edited image data returned from image model');
  }

  return uploadGeneratedImage(firstImage, 'png');
}

async function markTaskFailed(task, error) {
  const message = normalizeImageError(error);
  console.error(`[Image Task Processor] Task ${task.id} failed:`, message);

  await query('UPDATE tbn_user_credits SET credits = credits + ? WHERE email = ?', [
    Number(task.credits_cost || 0),
    task.email
  ]);

  await query(
    `UPDATE image_generation_tasks
     SET status = 'failed',
         error_message = ?
     WHERE id = ?`,
    [message, task.id]
  );
}

async function markTaskCompleted(task, payload, imageResult) {
  const isEditTask = task.task_type === 'image-edit';
  const inputImage = payload.images?.[0];
  const sketchUrl = isEditTask && inputImage
    ? `data:${inputImage.mimeType || 'image/png'};base64,${inputImage.base64}`
    : 'text-to-image';
  const dbSketchUrl = sketchUrl.startsWith('data:') && sketchUrl.length > 500
    ? 'error:input_base64_too_long'
    : sketchUrl;

  const savedImage = await saveDrawImagePair(
    task.email,
    dbSketchUrl,
    imageResult.url,
    imageResult.displayUrl,
    isEditTask ? 'edit' : 'text',
    payload.prompt,
    payload.prompt_en || payload.prompt,
    payload.prompt_zh || payload.prompt,
    payload.description || null
  );

  const resultPayload = {
    originalUrl: imageResult.url,
    freeimageUrl: imageResult.displayUrl,
    drawImageId: savedImage?.id || null,
    prompt: payload.prompt,
    size: payload.size || null
  };

  await query(
    'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM tbn_user_credits WHERE email = ?), ?)',
    [task.email, 'consume', -Number(task.credits_cost || 0), task.email, isEditTask ? 'Image editing' : 'Image generation']
  );

  await query(
    `UPDATE image_generation_tasks
     SET status = 'completed',
         result_payload = ?,
         draw_image_id = ?,
         error_message = NULL
     WHERE id = ?`,
    [JSON.stringify(resultPayload), savedImage?.id || null, task.id]
  );
}

export async function processImageTaskNow(taskId) {
  const rows = await query(
    `SELECT id, email, task_type, status, request_payload, credits_cost
     FROM image_generation_tasks
     WHERE id = ?
     LIMIT 1`,
    [taskId]
  );
  const task = rows?.[0];
  if (!task) {
    throw new Error(`Image task not found: ${taskId}`);
  }
  if (task.status !== 'pending') {
    return task;
  }

  await query(
    `UPDATE image_generation_tasks
     SET status = 'processing',
         attempts = attempts + 1,
         locked_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [task.id]
  );

  try {
    const payload = typeof task.request_payload === 'string'
      ? JSON.parse(task.request_payload)
      : task.request_payload;
    const imageResult = task.task_type === 'image-edit'
      ? await editImage(payload)
      : await generateImage(payload);
    await markTaskCompleted(task, payload, imageResult);
  } catch (error) {
    await markTaskFailed(task, error);
  }

  return task;
}
