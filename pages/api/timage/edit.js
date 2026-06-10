import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { query } from '../../../lib/db';
import { 
  ensureCreditsTables, 
  saveDrawImagePair, 
  uploadToFreeimageHost,
  processAndUploadImageUrl,
  calculateCreditsForSize
} from '../../../lib/image-agent-helpers';

export const config = {
  api: {
    bodyParser: false, // Disabling body parser to allow multer to parse multipart form data
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
  }
});

// Helper to run middleware in Next.js API Routes
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // Run the multer middleware to handle up to 6 files named 'image'
    await runMiddleware(req, res, upload.array('image', 6));

    const files = req.files;
    const { prompt, prompt_en, prompt_zh, description, size, n = '1', email } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one image file is required' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    await ensureCreditsTables();

    const CREDITS_PER_IMAGE = calculateCreditsForSize(size);
    let currentCredits = 0;

    if (email) {
      const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        // Pre-deduct atomically
        const updateResult = await query('UPDATE user_credits SET credits = credits - ? WHERE email = ? AND credits >= ?', [CREDITS_PER_IMAGE, email, CREDITS_PER_IMAGE]);
        if (updateResult.affectedRows === 0) {
          return res.status(400).json({ success: false, error: 'Insufficient credits', credits: userRows[0].credits });
        }
        currentCredits = userRows[0].credits - CREDITS_PER_IMAGE;
        
        // Mark for refund in case of error
        req.creditsPreDeducted = true;
        req.emailForRefund = email;
        req.creditsAmountToRefund = CREDITS_PER_IMAGE;
      } else {
        // New user: grant 30 free credits, pre-deduct 5 = 25
        console.log(`[TImage] Creating user with 30 free credits for ${email}`);
        await query('INSERT INTO user_credits (email, credits) VALUES (?, 25)', [email]);
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
          [email, 'gift', 30, 30, 'New user welcome bonus']
        );
        currentCredits = 25;

        // Mark for refund in case of error
        req.creditsPreDeducted = true;
        req.emailForRefund = email;
        req.creditsAmountToRefund = CREDITS_PER_IMAGE;
      }
    }

    const apiKey = process.env.VECTORENGINE_API_KEY;
    const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';
    const model = process.env.IMAGE_MODEL || 'gpt-image-2';

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'VECTORENGINE_API_KEY is not configured in .env' });
    }

    console.log('[TImage] Initiating edit request to VectorEngine:', {
      model,
      filesCount: files.length,
      size: size || 'omitted',
      n,
      prompt
    });

    const formData = new FormData();
    formData.append('model', model);
    formData.append('prompt', prompt);
    if (size) {
      formData.append('size', size);
    }
    formData.append('n', n);

    // Append images
    files.forEach((file, index) => {
      formData.append('image', file.buffer, {
        filename: file.originalname || `image_${index}.png`,
        contentType: file.mimetype || 'image/png',
      });
    });

    const response = await axios.post(
      `${apiBase}/images/edits`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 400000, // 400s timeout
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );

    console.log('[TImage] VectorEngine edits response status:', response.status);

    const dataList = response.data?.data;
    if (!dataList || dataList.length === 0) {
      throw new Error('No edited image data returned from VectorEngine');
    }

    const firstImage = dataList[0];
    let originalUrl = firstImage.url;
    let b64Json = firstImage.b64_json;
    let freeimageUrl = '';

    if (b64Json) {
      freeimageUrl = `data:image/png;base64,${b64Json}`;
      originalUrl = freeimageUrl;
    } else if (originalUrl) {
      freeimageUrl = originalUrl;
    } else {
      throw new Error('Invalid edited image format returned from VectorEngine');
    }

    let finalCredits = currentCredits;
    let drawImageId = null;
    let originalInputB64 = null;

    if (files && files.length > 0) {
      originalInputB64 = `data:${files[0].mimetype || 'image/png'};base64,${files[0].buffer.toString('base64')}`;
    }

    // Synchronously upload to Freeimage.host
    let permanentInputUrl = 'temp_placeholder';
    let permanentInputDisplayUrl = 'temp_placeholder';
    let permanentOutputUrl = 'temp_placeholder';
    let permanentDisplayUrl = 'temp_placeholder';

    try {
      console.log(`[TImage Edit] Starting synchronous Freeimage upload for input...`);
      if (originalInputB64 && originalInputB64.startsWith('data:')) {
        const parts = originalInputB64.split(';base64,');
        const mimeType = parts[0].split(':')[1] || 'image/png';
        const b64Data = parts[1];
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
        const uploadResult = await uploadToFreeimageHost(b64Data, `input_${Date.now()}.${ext}`, mimeType);
        permanentInputUrl = uploadResult.url;
        permanentInputDisplayUrl = uploadResult.displayUrl;
      }
    } catch (inUploadErr) {
      console.error('[TImage Edit] Input upload failed, falling back:', inUploadErr.message);
      permanentInputUrl = originalInputB64 || 'temp_placeholder';
    }

    try {
      console.log(`[TImage Edit] Starting synchronous Freeimage upload for output...`);
      if (freeimageUrl.startsWith('data:')) {
        const parts = freeimageUrl.split(';base64,');
        const mimeType = parts[0].split(':')[1] || 'image/png';
        const b64Data = parts[1];
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
        const uploadResult = await uploadToFreeimageHost(b64Data, `edited_${Date.now()}.${ext}`, mimeType);
        permanentOutputUrl = uploadResult.url;
        permanentDisplayUrl = uploadResult.displayUrl;
      } else if (freeimageUrl.startsWith('http')) {
        const uploadResult = await processAndUploadImageUrl(freeimageUrl, `edited_${Date.now()}.png`);
        permanentOutputUrl = uploadResult.url;
        permanentDisplayUrl = uploadResult.displayUrl;
      }
      console.log(`[TImage Edit] Synchronous Freeimage upload complete.`);
    } catch (uploadErr) {
      console.error('[TImage Edit] Output upload failed, falling back:', uploadErr.message);
      permanentOutputUrl = uploadErr.base64Fallback || freeimageUrl;
      permanentDisplayUrl = uploadErr.base64Fallback || freeimageUrl;
    }

    let dbOutputUrl = permanentOutputUrl;
    let dbDisplayUrl = permanentDisplayUrl;
    let dbInputUrl = permanentInputUrl;

    if (dbOutputUrl.startsWith('data:') && dbOutputUrl.length > 500) {
      dbOutputUrl = 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Saved+Locally';
      dbDisplayUrl = 'https://placehold.co/1024x1024/2d3748/ffffff.png?text=Image+Saved+Locally';
    }
    if (dbInputUrl.startsWith('data:') && dbInputUrl.length > 500) {
      dbInputUrl = 'error:input_base64_too_long';
    }

    if (email) {
      try {
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, (SELECT credits FROM user_credits WHERE email = ?), ?)',
          [email, 'consume', -CREDITS_PER_IMAGE, email, 'Image editing']
        );
        console.log(`[TImage] Transaction logged for 5 credits editing.`);

        console.log(`[TImage] Saving edited image record to DB for email: ${email}`);
        const actualPromptEn = prompt_en || prompt;
        const actualPromptZh = prompt_zh || prompt;
        const savedImage = await saveDrawImagePair(
          email, 
          dbInputUrl, 
          dbOutputUrl, 
          dbDisplayUrl, 
          'edit', 
          prompt, // Main prompt (Chinese)
          actualPromptEn, // English prompt
          actualPromptZh, // Chinese prompt
          description || null
        );
        drawImageId = savedImage?.id || null;
      } catch (dbErr) {
        console.error('[TImage] Failed to update credits/save edit record to DB:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      originalUrl: permanentOutputUrl,
      freeimageUrl: permanentDisplayUrl,
      drawImageId,
      originalInputB64: permanentInputUrl,
      model,
      size,
      prompt,
      credits: finalCredits
    });

  } catch (error) {
    if (req.creditsPreDeducted && req.emailForRefund && req.creditsAmountToRefund) {
      console.log(`[TImage Edit] Refunding ${req.creditsAmountToRefund} credits to ${req.emailForRefund} due to error`);
      try {
        await query('UPDATE user_credits SET credits = credits + ? WHERE email = ?', [req.creditsAmountToRefund, req.emailForRefund]);
      } catch (refundErr) {
        console.error('[TImage Edit] Failed to refund credits:', refundErr.message);
      }
    }

    console.error('[TImage Edit] Error editing image:', error?.message);
    if (error.response) {
      console.error('[TImage Edit] VectorEngine error payload:', error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.error?.message || error.message || 'VectorEngine image edit failed'
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during image editing'
    });
  }
}
