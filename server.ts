import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const VALID_CATEGORIES = new Set([
  'Proteins',
  'Grains & Carbs',
  'Vegetables',
  'Fruits',
  'Dairy & Alternatives',
  'Fats & Nuts',
  'Prepared Meals',
  'Beverages',
]);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface RawAiFoodItem {
  name?: string;
  category?: string;
  servingLabel?: string;
  servingGrams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  fat?: number;
  gi?: number;
  tags?: string[];
}

interface RawAiMealResponse {
  mealSummary?: string;
  items?: RawAiFoodItem[];
}

const round1 = (val: unknown): number => {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 10) / 10;
};

const roundInt = (val: unknown, min = 0, max = 5000): number => {
  const num = Number(val);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/quick-log-meal', async (req, res) => {
    const description =
      typeof req.body?.description === 'string'
        ? req.body.description.trim()
        : '';
    const mealType =
      typeof req.body?.mealType === 'string' ? req.body.mealType.trim() : 'Meal';

    if (!description || description.length < 2) {
      res.status(400).json({
        error: 'Please enter a meal description (e.g. "2 eggs and 1 slice sourdough toast").',
      });
      return;
    }

    if (description.length > 500) {
      res.status(400).json({
        error: 'Meal description must be 500 characters or fewer.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Check Settings > Secrets.',
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Parse the following ${mealType} description into individual food items with realistic USDA-aligned macronutrients and glycemic index estimates:\n\n"${description}"`,
        config: {
          systemInstruction:
            'You are a clinical nutrition and glycemic control parser. Break a natural-language meal description into discrete food items matching the requested portions. Be realistic with portion weights, calories, protein, total carbs, fiber (never exceeding total carbs), sugar, fat, and Glycemic Index (0-100). Use valid categories only.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mealSummary: {
                type: Type.STRING,
                description:
                  'A concise 1-sentence summary of the parsed meal and glycemic impact.',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Clear food item name.',
                    },
                    category: {
                      type: Type.STRING,
                      description:
                        'Must be one of: Proteins, Grains & Carbs, Vegetables, Fruits, Dairy & Alternatives, Fats & Nuts, Prepared Meals, Beverages.',
                    },
                    servingLabel: {
                      type: Type.STRING,
                      description:
                        'Portion label matching the user description, e.g. "2 large eggs" or "1 cup (180g)".',
                    },
                    servingGrams: {
                      type: Type.INTEGER,
                      description: 'Estimated weight in grams for the serving.',
                    },
                    calories: {
                      type: Type.INTEGER,
                      description: 'Estimated calories (kcal) for this serving.',
                    },
                    protein: {
                      type: Type.NUMBER,
                      description: 'Protein in grams.',
                    },
                    carbs: {
                      type: Type.NUMBER,
                      description: 'Total carbohydrates in grams (including fiber).',
                    },
                    fiber: {
                      type: Type.NUMBER,
                      description: 'Dietary fiber in grams (<= carbs).',
                    },
                    sugar: {
                      type: Type.NUMBER,
                      description: 'Sugar in grams.',
                    },
                    fat: {
                      type: Type.NUMBER,
                      description: 'Total fat in grams.',
                    },
                    gi: {
                      type: Type.INTEGER,
                      description: 'Estimated Glycemic Index from 0 to 100.',
                    },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '1 to 3 short lowercase tags like low-gi, high-protein.',
                    },
                  },
                  required: [
                    'name',
                    'category',
                    'servingLabel',
                    'servingGrams',
                    'calories',
                    'protein',
                    'carbs',
                    'fiber',
                    'sugar',
                    'fat',
                    'gi',
                  ],
                },
              },
            },
            required: ['mealSummary', 'items'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as RawAiMealResponse;
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

      if (rawItems.length === 0) {
        res.status(422).json({
          error: 'Could not identify any foods from that description. Try adding portion details.',
        });
        return;
      }

      const items = rawItems.slice(0, 12).map((item, idx) => {
        const carbs = round1(item.carbs);
        const fiber = Math.min(carbs, round1(item.fiber));
        const sugar = Math.min(carbs, round1(item.sugar));
        const category =
          item.category && VALID_CATEGORIES.has(item.category)
            ? item.category
            : 'Prepared Meals';

        return {
          id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: (item.name || 'Parsed Food Item').trim().slice(0, 80),
          category,
          servingLabel: (item.servingLabel || '1 serving').trim().slice(0, 60),
          servingGrams: roundInt(item.servingGrams, 1, 3000),
          calories: roundInt(item.calories, 0, 4000),
          protein: round1(item.protein),
          carbs,
          fiber,
          sugar,
          fat: round1(item.fat),
          gi: roundInt(item.gi, 0, 100),
          tags: Array.isArray(item.tags)
            ? item.tags
                .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
                .slice(0, 3)
            : ['ai-logged'],
          isCustom: true,
        };
      });

      res.json({
        mealSummary:
          typeof parsed.mealSummary === 'string' && parsed.mealSummary.trim()
            ? parsed.mealSummary.trim()
            : `Parsed ${items.length} item${items.length === 1 ? '' : 's'} for ${mealType}.`,
        items,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to analyze meal description.';
      console.error('AI quick log error:', message);
      res.status(502).json({
        error:
          message.includes('API_KEY') || message.includes('403')
            ? 'Gemini API authorization failed. Check your API key in Settings > Secrets.'
            : 'Unable to parse meal with AI right now. Please try again.',
      });
    }
  });

  app.post('/api/ai/meal-tips', async (req, res) => {
    const mealTitle =
      typeof req.body?.mealTitle === 'string' ? req.body.mealTitle.trim() : 'Meal';
    const mealType =
      typeof req.body?.mealType === 'string' ? req.body.mealType.trim() : 'Meal';
    const itemsSummary =
      typeof req.body?.itemsSummary === 'string'
        ? req.body.itemsSummary.trim()
        : '';
    const totals = req.body?.totals ?? {};

    if (!itemsSummary) {
      res.status(400).json({ error: 'Meal summary is required to generate tips.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Check Settings > Secrets.',
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this ${mealType} (${mealTitle}) and give 3 practical, specific meal-improvement tweaks for better blood glucose stability and caloric deficit control:\n\nItems: ${itemsSummary}\nTotals: ${Number(totals.calories) || 0} kcal, ${Number(totals.netCarbs) || 0}g net carbs, ${Number(totals.protein) || 0}g protein, ${Number(totals.fiber) || 0}g fiber, ${Number(totals.fat) || 0}g fat, GL ${Number(totals.glycemicLoad) || 0}.`,
        config: {
          systemInstruction:
            'You are a practical registered dietitian specializing in glycemic control and sustainable caloric deficits. Provide 3 concise, concrete food-pairing, portion, or ingredient swap tweaks specific to the exact foods listed. Keep each tweak actionable in 1-2 sentences.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tweaks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Short 3-6 word tweak title.',
                    },
                    tweak: {
                      type: Type.STRING,
                      description: 'Practical 1-2 sentence meal adjustment.',
                    },
                    expectedImpact: {
                      type: Type.STRING,
                      description: 'Concise expected glucose/calorie benefit.',
                    },
                  },
                  required: ['title', 'tweak', 'expectedImpact'],
                },
              },
            },
            required: ['tweaks'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        tweaks?: { title?: string; tweak?: string; expectedImpact?: string }[];
      };
      const tweaks = (Array.isArray(parsed.tweaks) ? parsed.tweaks : [])
        .slice(0, 4)
        .map((item) => ({
          title: (item.title || 'Meal Improvement Tip').trim(),
          tweak: (item.tweak || '').trim(),
          expectedImpact: (item.expectedImpact || 'Flatter glucose curve').trim(),
        }))
        .filter((item) => item.tweak.length > 0);

      res.json({ tweaks });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate meal tips.';
      console.error('AI meal tips error:', message);
      res.status(502).json({
        error: 'Unable to generate AI meal tweaks right now. Please try again.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlycoLedger server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
