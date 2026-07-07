import axios from 'axios';
import https from 'https';

function getTextProvider() {
  return (process.env.TEXT_MODEL_PROVIDER || 'tokenrouter').toLowerCase();
}

function getTextModel() {
  return process.env.TEXT_MODEL || process.env.PROMPT_MODEL || 'google/gemini-3.5-flash';
}

function getTokenRouterConfig() {
  const apiKey = process.env.TOKENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('TOKENROUTER_API_KEY is not configured');
  }

  return {
    apiKey,
    baseUrl: (process.env.TOKENROUTER_API_BASE || 'https://api.tokenrouter.com/v1beta/models').replace(/\/$/, ''),
    model: getTextModel()
  };
}

function getVectorEngineConfig() {
  const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
  if (!apiKey) {
    throw new Error('VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured');
  }

  return {
    apiKey,
    baseUrl: (process.env.VECTORENGINE_GEMINI_STREAM_BASE || 'https://api.vectorengine.ai/v1beta').replace(/\/$/, ''),
    chatBaseUrl: (process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1').replace(/\/$/, ''),
    model: process.env.PROMPT_MODEL || process.env.TEXT_MODEL || 'gemini-3.1-flash-lite'
  };
}

function hasVectorEngineConfig() {
  return Boolean(process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY);
}

function getProviderErrorText(error) {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  return [
    error?.message,
    data?.error?.message,
    data?.message,
    data?.error
  ].filter(Boolean).join(' ');
}

function shouldFallbackFromTokenRouter(error) {
  const status = error?.response?.status;
  const text = getProviderErrorText(error).toLowerCase();
  return (
    status === 402 ||
    status === 403 ||
    status === 429 ||
    error?.code === 'ECONNABORTED' ||
    text.includes('credit limit') ||
    text.includes('quota') ||
    text.includes('insufficient') ||
    text.includes('rate limit')
  );
}

function normalizeTextProviderError(error) {
  const status = error?.response?.status;
  const text = getProviderErrorText(error);
  if (
    status === 402 ||
    status === 403 ||
    text.toLowerCase().includes('credit limit') ||
    text.toLowerCase().includes('insufficient')
  ) {
    const normalized = new Error('文字模型供应商额度不足，请检查 TOKENROUTER_API_KEY 的余额或切换 TEXT_MODEL_PROVIDER。');
    normalized.statusCode = 503;
    normalized.cause = error;
    return normalized;
  }
  return error;
}

function buildGeminiPayload({ systemPrompt, userPrompt, temperature = 0.7, includeThoughts = false }) {
  return {
    ...(systemPrompt ? {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    } : {}),
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature,
      topP: 1,
      thinkingConfig: {
        includeThoughts,
        thinkingBudget: parseInt(process.env.GEMINI_THINKING_BUDGET || '8192', 10)
      }
    }
  };
}

export function extractGeminiText(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
}

export function extractStreamTextFromJson(data) {
  const openAiText = data?.choices?.[0]?.delta?.content || '';
  if (openAiText) return openAiText;
  return extractGeminiText(data);
}

export async function generateText({ systemPrompt, userPrompt, temperature = 0.7, timeout = 90000 }) {
  const provider = getTextProvider();

  if (provider === 'tokenrouter') {
    try {
      const config = getTokenRouterConfig();
      const response = await axios.post(
        `${config.baseUrl}/${config.model}:generateContent`,
        buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.apiKey
          },
          timeout,
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );
      return extractGeminiText(response.data);
    } catch (error) {
      if (hasVectorEngineConfig() && shouldFallbackFromTokenRouter(error)) {
        console.warn('[TextModel] TokenRouter unavailable, falling back to VectorEngine:', getProviderErrorText(error));
      } else {
        throw normalizeTextProviderError(error);
      }
    }
  }

  const config = getVectorEngineConfig();
  const response = await axios.post(
    `${config.chatBaseUrl}/chat/completions`,
    {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ],
      temperature
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }
  );
  return response.data?.choices?.[0]?.message?.content || '';
}

export async function streamText({ systemPrompt, userPrompt, temperature = 0.7, timeout = 70000 }) {
  const provider = getTextProvider();

  if (provider === 'tokenrouter') {
    try {
      const config = getTokenRouterConfig();
      const response = await axios.post(
        `${config.baseUrl}/${config.model}:streamGenerateContent?alt=sse`,
        buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.apiKey
          },
          timeout,
          responseType: 'stream',
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );
      return response.data;
    } catch (error) {
      if (hasVectorEngineConfig() && shouldFallbackFromTokenRouter(error)) {
        console.warn('[TextModel] TokenRouter stream unavailable, falling back to VectorEngine:', getProviderErrorText(error));
      } else {
        throw normalizeTextProviderError(error);
      }
    }
  }

  const config = getVectorEngineConfig();
  const response = await axios.post(
    `${config.baseUrl}/models/${config.model}:streamGenerateContent?key=&alt=sse`,
    buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout,
      responseType: 'stream',
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }
  );
  return response.data;
}
