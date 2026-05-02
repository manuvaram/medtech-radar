export async function POST(request) {
  const { cadence, themes, companies } = await request.json();

  const windowMap = {
    daily: "the last 48 hours",
    weekly: "the last 7 days",
    monthly: "the last 30 days",
    quarterly: "the last 90 days",
  };

  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are MedTech Radar. Today's date is ${today}.

Search the web for REAL news published in ${windowMap[cadence]} about these companies: ${companies}.
Focus on these themes: ${themes}.

Only include signals that are:
- Product launches, FDA clearances, clinical trial results
- Earnings results, revenue guidance, market share shifts
- M&A deals, PE investments, major partnerships
- CMS/Medicare reimbursement policy changes
- CEO or President level leadership changes only

Do NOT include: IR roles, admin appointments, conference talks, awards.

Tag each signal with EXACTLY one theme from this list: ${themes}

Return ONLY a valid JSON array, no markdown, no explanation. Each object:
{
  "co": "short company name",
  "type": "Earnings or Regulatory or M&A or Market or Personnel",
  "headline": "max 15 word headline",
  "pov": "one sentence on HME or PE implications",
  "time": "actual pub date as Mon DD",
  "theme": "exact theme name from the list",
  "source": "publication name"
}

If you find no real news, return an empty array []. Max 8 signals.`;

  try {
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
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    // Return full debug info so we can diagnose
    if (data.error) {
      return Response.json({ signals: [], error: data.error });
    }

    const textBlock = data.content?.find((b) => b.type === "text");
    const raw = textBlock?.text || "[]";

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
