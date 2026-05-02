// Simple in-memory cache: { key: { signals, timestamp } }
const cache = {};
const CACHE_TTL = {
  daily: 4 * 60 * 60 * 1000,      // 4 hours
  weekly: 24 * 60 * 60 * 1000,    // 24 hours
  monthly: 48 * 60 * 60 * 1000,   // 48 hours
  quarterly: 72 * 60 * 60 * 1000, // 72 hours
};

export async function POST(request) {
  const { cadence, themes, companies } = await request.json();

  // Cache key based on cadence + themes
  const cacheKey = `${cadence}__${themes}`;
  const now = Date.now();
  const ttl = CACHE_TTL[cadence] || CACHE_TTL.daily;

  // Return cached result if fresh
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < ttl) {
    return Response.json({ signals: cache[cacheKey].signals, cached: true });
  }

  const windowMap = {
    daily: "the last 48 hours",
    weekly: "the last 7 days",
    monthly: "the last 30 days",
    quarterly: "the last 90 days",
  };

  // Map themes to richer search terms
  const themeSearchTerms = {
    "Urology": "urological catheters intermittent catheterization bladder management sacral neuromodulation overactive bladder",
    "Diabetes": "continuous glucose monitoring insulin delivery CGM insulin pump diabetes devices",
    "Structural Heart": "structural heart TAVR WATCHMAN heart valve transcatheter",
    "Robotics": "surgical robotics robotic surgery robot-assisted procedure",
    "Reimbursement": "CMS reimbursement Medicare coverage HME policy MedTech coverage",
    "M&A / PE": "MedTech acquisition merger private equity deal healthcare investment",
  };

  const today = new Date().toISOString().split('T')[0];
  const themeList = themes.split(", ");
  const expandedThemes = themeList.map(t => `${t}: ${themeSearchTerms[t] || t}`).join(" | ");

  // Exact theme names for tagging — model must use these exactly
  const exactThemeNames = themeList.join(", ");

  const prompt = `You are MedTech Radar. Today's date is ${today}.

Search the web for REAL news published in ${windowMap[cadence]} about: ${companies}.
Use these expanded search terms per theme: ${expandedThemes}.

STRICT SIGNAL RULES — only include:
- Product launches, FDA clearances, clinical trial results
- Earnings results, revenue guidance, market share data
- M&A deals, PE investments, partnerships
- CMS/Medicare reimbursement policy changes
- CEO, President, or Division GM level leadership changes only

EXCLUDE: IR/communications roles, admin appointments, conference talks, awards.

THEME TAGGING — critical: tag each signal with EXACTLY one of these theme names: ${exactThemeNames}
Use the exact string, no variations.

Return ONLY a valid JSON array. Each object:
{
  "co": "short company name e.g. BSX",
  "type": "Earnings|Regulatory|M&A|Market|Personnel",
  "headline": "max 15 word headline",
  "pov": "one sentence on HME/consumables or PE implications",
  "time": "actual pub date as Mon DD e.g. May 02",
  "theme": "EXACT theme name from list above",
  "source": "publication name"
}

No markdown. No preamble. Only the JSON array. Max 8 signals. Only verified real news.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      tools: [{
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4  // Limit searches to control cost
      }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  const raw = textBlock?.text || "[]";

  let signals = [];
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    signals = match ? JSON.parse(match[0]) : [];
  } catch {
    signals = [];
  }

  // Store in cache
  cache[cacheKey] = { signals, timestamp: now };

  return Response.json({ signals, cached: false });
}
