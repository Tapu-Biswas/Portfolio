// Vercel serverless function — POST /api/chat
// Does lightweight keyword retrieval over the publications list, then asks
// Claude to answer grounded only in the matched abstracts. Needs the
// ANTHROPIC_API_KEY environment variable set in your Vercel project
// (Settings → Environment Variables) — see README.md.

const PUBLICATIONS = [
  { title: "Real-Time Detection of Forest Fires Using FireNet-CNN and Explainable AI Techniques", venue: "IEEE Access", date: "Mar 2025", citations: 27, authors: ["Gazi Mohammad Imdadul Alam", "Naima Tasnia", "Tapu Biswas", "et al.", "Md Saef Ullah Miah"], url: "https://www.researchgate.net/profile/Tapu-Biswas-5", abstract: "Presents FireNet-CNN, a CNN for real-time forest fire detection from imagery, combined with explainable AI (XAI) techniques. Published in IEEE Access, 27 citations, 753 reads. Tapu Biswas was a contributing (non-lead) author." },
  { title: "An Explainable Analytics Framework for Predicting Diabetes in Women Using CNNs", venue: "Healthcare Analytics", date: "Oct 2025", citations: 4, authors: ["Gazi Mohammad Imdadul Alam", "Tapu Biswas", "Sharia Arfin Tanim", "M. Firoz Mridha, Ph.D."], url: "https://www.researchgate.net/profile/Tapu-Biswas-5", abstract: "A CNN-based framework for diabetes prediction in women with explainability so clinicians can see which features drove each prediction." },
  { title: "Binary and Multi-Class Prediction of DDoS Attack Using Deep Learning Models", venue: "Int. J. Data Science & Big Data Analytics", date: "Nov 2024", citations: 4, authors: ["Tapu Biswas", "Farhan Sadik Ferdous", "Akinul Islam Jony"], url: "https://www.researchgate.net/profile/Tapu-Biswas-5", abstract: "Evaluates deep learning models for binary and multi-class classification of DDoS network traffic." },
  { title: "Machine Learning-Based Detection of Student Stress Levels Through Socioeconomic Status", venue: "Article", date: "Feb 2026", citations: 2, authors: ["Tapu Biswas", "Razowana Khan Mim", "Farhan Sadik Ferdous"], url: "https://www.researchgate.net/profile/Tapu-Biswas-5", abstract: "Investigates whether socioeconomic indicators can predict student stress levels using supervised machine learning models." },
  { title: "Programming Languages Prediction from Stack Overflow Questions Using Deep Learning", venue: "JINITA", date: "Dec 2024", citations: 1, authors: ["Razowana Khan Mim", "Tapu Biswas"], url: "https://www.researchgate.net/profile/Tapu-Biswas-5", abstract: "Uses deep learning to predict the programming language associated with a Stack Overflow question." },
  { title: "ScrumSpiral: An Improved Hybrid Software Development Model", venue: "IJITCS", date: "2024", authors: ["Tapu Biswas", "Farhan Sadik Ferdous", "Zinniya Taffannum Pritee", "Akinul Islam Jony"], url: "https://doi.org/10.5815/IJITCS.2018.12.06", abstract: "A hybrid SDLC model combining Scrum's iterative sprints with Spiral's risk-driven planning. Tapu Biswas's bachelor's thesis." }
];

const STOPWORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "was", "were", "using", "used", "into", "over", "are", "his", "her", "their", "what", "which", "you", "your", "tell", "about", "does", "did", "can"]);

function tokenize(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function scoreDoc(qTokens, doc) {
  const docTokens = tokenize(`${doc.title} ${doc.abstract} ${doc.venue} ${doc.authors.join(" ")}`);
  const docSet = new Set(docTokens);
  let score = 0;
  for (const qt of qTokens) {
    if (STOPWORDS.has(qt)) continue;
    if (docSet.has(qt)) score += 1;
    else if (docTokens.some((dt) => dt.includes(qt) || qt.includes(dt))) score += 0.5;
  }
  const titleSet = new Set(tokenize(doc.title));
  for (const qt of qTokens) { if (titleSet.has(qt)) score += 1.5; }
  return score;
}

function retrieveRelevant(query, topK = 3) {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return PUBLICATIONS.slice(0, topK);
  const scored = PUBLICATIONS.map((doc) => ({ doc, score: scoreDoc(qTokens, doc) })).sort((a, b) => b.score - a.score);
  const any = scored.some((s) => s.score > 0);
  const pool = any ? scored.filter((s) => s.score > 0) : scored;
  return pool.slice(0, topK).map((s) => s.doc);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set. Add it in your Vercel project's Environment Variables — see README.md.",
    });
    return;
  }

  try {
    const relevant = retrieveRelevant(message, 3);
    const context = relevant
      .map((p) => `Title: ${p.title}\nVenue: ${p.venue} (${p.date})\nAuthors: ${p.authors.join(", ")}\nAbstract: ${p.abstract}`)
      .join("\n\n");

    const systemPrompt = `You are the portfolio assistant for Tapu Biswas, an AI/ML Engineer. Visitors are asking about Tapu's published research. Answer ONLY using the publication context below — do not invent papers, results, or numbers not in the context. If the context doesn't answer the question, say so and point to ResearchGate (https://www.researchgate.net/profile/Tapu-Biswas-5). Name the specific paper you're referencing. Keep answers to 2-4 sentences, conversational.\n\nPUBLICATION CONTEXT:\n${context}`;

    const messages = [...(Array.isArray(history) ? history : []), { role: "user", content: message }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
      return;
    }

    const data = await response.json();
    const textBlock = data.content?.find((c) => c.type === "text");

    res.status(200).json({
      reply: textBlock?.text ?? "Sorry, I couldn't generate a response.",
      sources: relevant.map((p) => ({ title: p.title, url: p.url })),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
};
