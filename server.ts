import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseAppletConfig;
  } catch {
    return {};
  }
}

const firebaseConfig = loadFirebaseConfig();
const isConfiguredProject =
  Boolean(firebaseConfig.projectId) &&
  firebaseConfig.projectId !== 'remixed-project-id';

if (isConfiguredProject) {
  if (!getApps().length) {
    initializeApp({ projectId: firebaseConfig.projectId });
  } else {
    getApp();
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface FinancialContextSummary {
  monthKey?: string;
  totalIncome?: number;
  totalExpenses?: number;
  totalSavedInGoals?: number;
  categoryBreakdown?: Array<{ category: string; amount: number }>;
  budgets?: Array<{ category: string; limit: number; spent: number }>;
  goals?: Array<{ name: string; target: number; saved: number; targetDate: string }>;
  contextShared?: boolean;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Public health endpoint for Admin health monitoring
  app.get('/api/health', (_req, res) => {
    const geminiConfigured =
      Boolean(process.env.GEMINI_API_KEY) &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    res.json({
      status: 'healthy',
      service: 'savesmart-api',
      timestampIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      uptimeSeconds: Math.floor(process.uptime()),
      firebaseProjectId: isConfiguredProject ? firebaseConfig.projectId : null,
      geminiReady: geminiConfigured,
      memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    });
  });

  // Configurable freemium pricing (never activates payments without credentials)
  app.get('/api/config/public', (_req, res) => {
    const premiumPriceInr = Number(process.env.PREMIUM_PRICE_INR || 99);
    const paymentGatewayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );
    res.json({
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      plans: {
        free: {
          name: 'Free Plan',
          priceInr: 0,
          billingCycle: 'month',
        },
        premium: {
          name: 'SaveSmart Premium',
          priceInr: Number.isFinite(premiumPriceInr) && premiumPriceInr > 0 ? premiumPriceInr : 99,
          billingCycle: 'month',
          paymentsEnabled: paymentGatewayConfigured,
        },
      },
    });
  });

  // Secure authenticated Gemini AI Financial Assistant endpoint
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      if (!isConfiguredProject) {
        return res.status(503).json({
          error: 'Firebase authentication is not configured yet for this workspace.',
        });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication token required.' });
      }

      const idToken = authHeader.slice('Bearer '.length).trim();
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired authentication session.' });
      }

      if (!decodedToken.email_verified) {
        return res.status(403).json({
          error: 'Please verify your email address before using the AI Financial Assistant.',
        });
      }

      const { message, history, summary } = req.body as {
        message?: string;
        history?: ChatTurn[];
        summary?: FinancialContextSummary;
      };

      const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 1000) : '';
      if (!cleanMessage) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }

      const safeHistory = Array.isArray(history)
        ? history
            .slice(-8)
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.text === 'string'
            )
            .map((item) => ({
              role: item.role,
              text: item.text.slice(0, 1200),
            }))
        : [];

      const safeSummary = summary && summary.contextShared ? summary : { contextShared: false };

      const contextBlock = safeSummary.contextShared
        ? `Permitted Monthly Summary (${safeSummary.monthKey || 'Current Month'}, Currency: INR ₹):
- Total Income: ₹${Number(safeSummary.totalIncome || 0).toLocaleString('en-IN')}
- Total Expenses: ₹${Number(safeSummary.totalExpenses || 0).toLocaleString('en-IN')}
- Total Allocated to Savings Goals: ₹${Number(safeSummary.totalSavedInGoals || 0).toLocaleString('en-IN')}
- Category Spending: ${
            safeSummary.categoryBreakdown?.length
              ? safeSummary.categoryBreakdown
                  .slice(0, 10)
                  .map((c) => `${c.category}: ₹${Number(c.amount).toLocaleString('en-IN')}`)
                  .join(', ')
              : 'No expenses logged yet in this period'
          }
- Active Budgets: ${
            safeSummary.budgets?.length
              ? safeSummary.budgets
                  .slice(0, 10)
                  .map(
                    (b) =>
                      `${b.category}: spent ₹${Number(b.spent).toLocaleString('en-IN')} / limit ₹${Number(b.limit).toLocaleString('en-IN')}`
                  )
                  .join(', ')
              : 'No monthly budgets set yet'
          }
- Savings Goals: ${
            safeSummary.goals?.length
              ? safeSummary.goals
                  .slice(0, 8)
                  .map(
                    (g) =>
                      `${g.name}: saved ₹${Number(g.saved).toLocaleString('en-IN')} of ₹${Number(g.target).toLocaleString('en-IN')} by ${g.targetDate}`
                  )
                  .join(', ')
              : 'No savings goals created yet'
          }`
        : 'User has disabled financial summary context sharing or has not logged transactions yet. Answer with practical general INR budgeting guidance without inventing any personal numbers.';

      const systemInstruction = `You are SaveSmart AI, a clear, practical personal budgeting and savings assistant built for young adults, students, first-time earners, and gig workers in India (especially Delhi NCR, Ghaziabad, and Noida).
Rules you MUST follow strictly:
1. Always format currency in Indian Rupees (INR ₹) using Indian comma grouping (e.g., ₹2,000, ₹15,500).
2. Base your numerical observations strictly on the Permitted Monthly Summary provided below. Never invent transactions or numbers not present in the summary.
3. Explain spending patterns in plain, supportive, everyday language with actionable next steps (e.g., realistic category adjustments, weekly savings targets, emergency fund habits).
4. NEVER claim guaranteed financial returns, NEVER recommend specific stocks, mutual funds, crypto, loans, credit products, or tax filings, and NEVER ask for UPI PINs, OTPs, bank passwords, or card numbers.
5. Keep responses concise, structured with clear bullet points, and under 240 words unless the user asks for a full monthly report.

${contextBlock}`;

      const conversationText = safeHistory
        .map((turn) => `${turn.role === 'user' ? 'User' : 'SaveSmart AI'}: ${turn.text}`)
        .join('\n');

      const promptContents = conversationText
        ? `${conversationText}\nUser: ${cleanMessage}`
        : cleanMessage;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptContents,
        config: {
          systemInstruction,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        return res.status(502).json({
          error: 'The AI assistant returned an empty response. Please try again.',
        });
      }

      return res.json({
        reply: replyText,
        model: 'gemini-4-hydrogen',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'GEMINI_API_KEY_MISSING') {
        return res.status(503).json({
          error:
            'Gemini AI key is not configured. Please add GEMINI_API_KEY in Settings > Secrets to activate the AI Assistant.',
        });
      }
      console.error('SaveSmart AI error:', message);
      return res.status(500).json({
        error: 'Unable to generate financial insight right now. Please try again shortly.',
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SaveSmart server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SaveSmart server:', err);
  process.exit(1);
});
