import axios from 'axios';
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { text, unifiedStyle, sceneCount = 6, image } = req.body;
  const targetSceneCount = Math.min(20, Math.max(2, parseInt(sceneCount) || 6));

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Text content is required' });
  }

  try {
    const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
    const apiBase = process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1';

    // We can use a fast model like gpt-4o-mini or gemini-1.5-flash for text extraction
    const promptModel = process.env.PROMPT_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured in .env' });
    }

    const styleInstruction = unifiedStyle
      ? `\nCRITICAL STYLE REQUIREMENT: You MUST enforce the art style "${unifiedStyle}" in EVERY single prompt you generate. Ignore any conflicting style references in the text.`
      : '';

    const systemPrompt = `You are an expert Storyboard Director and Prompt Engineer.
Your task is to analyze the user's provided long text, story, or article, and split it into EXACTLY ${targetSceneCount} logical visual scenes. You MUST generate exactly ${targetSceneCount} scenes, no more, no less.
For each scene, extract the core action/visual and write a highly detailed, professional Chinese image generation prompt.${styleInstruction}
${image ? "IMPORTANT: The user has provided a base image. You MUST analyze this base image. Ensure that your extracted scene prompts are highly relevant and visually consistent with the main subjects, composition, or elements found in this base image. The prompts should describe scenes that can naturally be derived or modified from this base image.\n" : ""}IMPORTANT: Our image model is highly capable of rendering typography. If the user's text requests words, captions, or typography to be included IN the image, you MUST specify exactly what text to write in the prompt (e.g. 'with the text "Hello" written on it'). Do NOT append "no text" to the prompt if the user asks for text!
Also provide a short Chinese description of what the scene is about.

Return the response STRICTLY as a JSON array of objects. Do not include markdown code blocks around the JSON.
Format:
[
  {
    "description": "Scene description in Chinese",
    "prompt": "highly detailed prompt in Chinese for image generation, cinematic lighting, 8k..."
  }
]`;

    const userMessageContent = image
      ? [
        { type: 'text', text: `Please analyze the following text and the provided base image, then extract scenes:\n\n${text}` },
        { type: 'image_url', image_url: { url: image } }
      ]
      : `Please analyze the following text and extract scenes:\n\n${text}`;

    console.log(`[Extract Scenes] Sending request to VectorEngine:`, {
      model: promptModel,
      textLength: text.length,
      hasImage: !!image
    });

    const response = await axios.post(
      `${apiBase}/chat/completions`,
      {
        model: promptModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI model');
    }

    // Clean JSON
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n/, '');
      cleanedContent = cleanedContent.replace(/\n```$/, '');
      cleanedContent = cleanedContent.trim();
    }

    let scenes = [];
    try {
      scenes = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error('[Extract Scenes] Failed to parse JSON. Content:', content);
      throw new Error('AI returned invalid format. Please try again.');
    }

    // Limit to user defined exact scenes if AI generates too many
    if (scenes.length > targetSceneCount) {
      scenes = scenes.slice(0, targetSceneCount);
    }

    return res.json({
      success: true,
      scenes
    });

  } catch (error) {
    console.error('[Extract Scenes Error]', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Server Error'
    });
  }
}
