const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Each AI mode gets its own personality/instructions
const SYSTEM_PROMPTS = {
  General: 'You are a helpful, friendly general-purpose assistant.',
  Coding:
    'You are an expert coding assistant. Give clear, correct, well-explained code help. Prefer concise code examples with brief explanations.',
  Productivity:
    'You are a productivity coach. Help the user organize tasks, build habits, and stay focused. Be encouraging and practical.',
  Learning:
    'You are a patient learning assistant. Explain concepts step by step, check understanding, and use examples suited to a beginner.',
};

// Converts our stored Message documents into the { role, parts } shape the SDK expects
const buildHistory = (messages) => {
  return messages.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
};

// Streams a Gemini response chunk by chunk, calling onChunk(text) for each piece
// as it arrives. Returns the full assembled text once streaming finishes.
// `settings` (from the user's AISettings document) can override the defaults below;
// a non-empty settings.systemPrompt overrides the built-in mode prompt entirely.
const streamAIResponse = async ({ mode, history, userMessage, onChunk, settings = {} }) => {
  const systemInstruction =
    settings.systemPrompt && settings.systemPrompt.trim().length > 0
      ? settings.systemPrompt
      : SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.General;

  const chat = ai.chats.create({
    model: 'gemini-3.6-flash',
    config: {
      systemInstruction,
      temperature: settings.temperature ?? 0.7,
      maxOutputTokens: settings.maxTokens ?? 1000,
      // Gemini 3.x replaced the old numeric thinkingBudget with a string
      // thinkingLevel ('minimal'/'low'/'medium'/'high'). 'low' keeps reasoning
      // light for a simple chat use case without the thought-signature
      // requirements that come with 'minimal'.
      thinkingConfig: { thinkingLevel: 'low' },
    },
    history: buildHistory(history),
  });

  const stream = await chat.sendMessageStream({ message: userMessage });

  let fullText = '';
  for await (const chunk of stream) {
    const chunkText = chunk.text || '';
    if (chunkText) {
      fullText += chunkText;
      onChunk(chunkText);
    }
  }

  return fullText;
};

module.exports = { streamAIResponse };
