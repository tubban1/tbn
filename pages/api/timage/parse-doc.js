import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

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
    await runMiddleware(req, res, upload.single('file'));

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = file;
    const ext = originalname.split('.').pop().toLowerCase();

    let extractedText = '';

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (ext === 'docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (ext === 'txt' || mimetype === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' });
    }

    // Clean up text
    extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    return res.json({
      success: true,
      text: extractedText
    });
  } catch (error) {
    console.error('[Parse Doc API] Error parsing document:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to parse document' });
  }
}
