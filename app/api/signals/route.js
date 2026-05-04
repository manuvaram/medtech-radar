export async function POST(request) {
  const { cadence, themes, companies } = await request.json();

  const windowMap = {
    daily: "last 2 days",
    weekly: "last 7 days",
    monthly: "last 30 days",
    quarterly: "last 90 days",
  };

  const dateRestrictMap = {
    daily: "d2",
    weekly: "w1",
    monthly: "m1",
    quarterly: "m3",
  };

  const themeQueries = {
    "Urology": "urology catheter bladder intermittent catheterization sacral neuromodulation",
    "Diabetes": "continuous glucose monitor insulin pump diabetes devices CGM",
    "Structural Heart": "structural heart TAVR WATCHMAN transcatheter heart valve",
    "Robotics": "surgical robotics robot-assisted surgery",
    "Reimbursement": "CMS Medicare reimbursement MedTech HME coverage policy",
    "M&A / PE": "MedTech acquisition merger private equity deal",
  };

  const companyList = companies.split(", ");
  const themeList = themes.split(", ");
  const dateRestrict = dateRestrictMap[cadence] || "m1";
  const today = new Date().toISOString().split("T")[0];

  // Build search queries: one per theme combining companies + theme terms
  const queries = themeList.map(theme => {
    const themeTerms = themeQueries[theme] || theme;
    const companyTerms = companyList.slice(0, 4).join(" OR ");
    return `(${companyTerms}) (${themeTerms})`;
  });

  // Run Google searches in parallel
  const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

  let allArticles = [];

  try {
    const searchResults = await Promise.all(
      queries.map(async (q, i) => {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(q)}&dateRestrict=${dateRestrict}&num=5&sort=date`;
        const res = await fetch(url);
        const data = await res.json();
        const items = data.items || [];
        return items.map(item => ({
          theme: themeList[i],
          title: item.title,
          snippet: item.snippet,
          source: item.displayLink,
          date: item.pagemap?.metatags?.[0]?.["article:published_time"]?.split("T")[0] || today,
        }));
      })
    );

    allArticles = searchResults.flat().slice(0, 20);
  } catch (e) {
    return Response.json({ signals: [], fetchError: e.message });
  }

  if (allArticles.length === 0) {
    return Response.json({ signals: [], error: "No articles found from Google Search" });
  }

  // Pass articles to Claude for analysis only — minimal tokens
  const articleText = allArticles.map((a, i) =>
    `[${i + 1}] Theme: ${a.theme} | Source: ${a.source} | Date: ${a.date}\nTitle: ${a.title}\nSnippet: ${a.snippet}`
  ).join("\n\n");

  const prompt = `Today is ${today}. You are MedTech Radar, a market intelligence tool for a senior MedTech executive.

Here are real news articles from Google Search for the ${windowMap[cadence]}:

${articleText}

From these articles, select the 6 most important signals. Only include:
- Earnings, revenue, guidance changes
- FDA clearances or regulatory decisions
- M&A deals, PE investments
- CMS/Medicare reimbursement changes
- CEO or President level leadership changes

Exclude: IR roles, awards, conferences, administrative appointments.

For each selected article return a JSON object with:
- co: company short name (e.g. "BSX", "MDT", "Convatec")
- type: "Earnings" or "Regulatory" or "M&A" or "Market" or "Personnel"
- headline: max 15 word summary
- pov: one sentence on HME/consumables or PE implications
- time: date as "Mon DD"
- theme: exact theme name from the article
- source: publication domain

Return ONLY a valid JSON array, no markdown, no explanation.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ signals: [], error: data.error });
    }

    const raw = data.content?.find((b) => b.type === "text")?.text || "[]";

    let signals = [];
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      const match = clean.match(/\[[\s\S]*\]/);
      signals = match ? JSON.parse(match[0]) : [];
    } catch (e) {
      return Response.json({ signals: [], parseError: e.message, raw });
    }

    return Response.json({ signals });

  } catch (e) {
    return Response.json({ signals: [], fetchError: e.message });
  }
}
