import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { query } from '../../../lib/db';
import { 
  ensureCreditsTables, 
  saveDrawImagePair, 
  uploadToFreeimageHost,
  processAndUploadImageUrl
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
    // Run the multer middleware to handle up to 2 files named 'image'
    await runMiddleware(req, res, upload.array('image', 2));

    const files = req.files;
    const { prompt, size, n = '1', email } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one image file is required' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    await ensureCreditsTables();

    const CREDITS_PER_IMAGE = 5;
    let currentCredits = 0;

    if (email) {
      const userRows = await query('SELECT credits FROM user_credits WHERE email = ?', [email]);
      if (userRows && userRows.length > 0) {
        currentCredits = userRows[0].credits;
        if (currentCredits < CREDITS_PER_IMAGE) {
          return res.status(400).json({ success: false, error: 'Insufficient credits', credits: currentCredits });
        }
      } else {
        // New user: grant 30 free credits
        console.log(`[TImage] Creating user with 30 free credits for ${email}`);
        await query('INSERT INTO user_credits (email, credits) VALUES (?, 30)', [email]);
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
          [email, 'gift', 30, 30, 'New user welcome bonus']
        );
        currentCredits = 30;
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
        timeout: 400000 // 400s timeout
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

    // Asynchronous Persistence Pattern: return raw image immediately to frontend
    // The background /persist endpoint will handle Freeimage.host upload later.
    // We save the raw base64 temporarily to the DB to avoid Vercel 4.5MB payload limits during /persist
    let permanentInputUrl = 'text-to-image';
    let permanentInputDisplayUrl = 'text-to-image';
    if (files && files.length > 0) {
      originalInputB64 = `data:${files[0].mimetype || 'image/png'};base64,${files[0].buffer.toString('base64')}`;
      permanentInputUrl = originalInputB64;
      permanentInputDisplayUrl = originalInputB64;
    }

    // 2. Output image persistence placeholder
    let permanentOutputUrl = freeimageUrl;
    let permanentDisplayUrl = freeimageUrl;

    if (email) {
      try {
        finalCredits = currentCredits - CREDITS_PER_IMAGE;
        await query('UPDATE user_credits SET credits = ? WHERE email = ?', [finalCredits, email]);
        await query(
          'INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)',
          [email, 'consume', -CREDITS_PER_IMAGE, finalCredits, 'Image editing']
        );
        console.log(`[TImage] Deducted 5 credits for image editing. Remaining: ${finalCredits}`);

        console.log(`[TImage] Saving edited image record to DB for email: ${email}`);
        const savedImage = await saveDrawImagePair(email, permanentInputUrl, permanentOutputUrl, permanentDisplayUrl, 'edit', prompt);
        drawImageId = savedImage?.id || null;
      } catch (dbErr) {
        console.error('[TImage] Failed to update credits/save edit record to DB:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      originalUrl: freeimageUrl,
      freeimageUrl: freeimageUrl,
      drawImageId,
      originalInputB64,
      model,
      size,
      prompt,
      credits: finalCredits
    });

  } catch (error) {
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
