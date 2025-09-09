import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { extractAppId } from './match.js';
import { keywordRankAndTop } from './cse.js';

const app = express();
app.use(cors({ origin: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

const Body = z.object({
  appUrl: z.string().url(),
  keyword: z.string().min(1),
  gl: z.string().default('dk'),
  hl: z.string().default('da'),
});

app.post('/rank', async (req, res) => {
  try {
    const { appUrl, keyword, gl, hl } = Body.parse(req.body);
    const appId = extractAppId(appUrl);
    const out = await keywordRankAndTop({ keyword, appId, gl, hl });
    res.json({ appUrl, keyword, gl, hl, rank: out.rank, matchedUrl: out.matchedUrl, serpTop: out.serpTop });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? String(e) });
  }
});

const PORT = Number(process.env.PORT ?? 8787);
app.listen(PORT, () => console.log(`WebRank API listening on http://localhost:${PORT}`));
