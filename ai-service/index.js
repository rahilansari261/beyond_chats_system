require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const LARAVEL_API = process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000/api/articles';

// Provider Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize clients
let genAI = null;
let groq = null;

if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}
if (GROQ_API_KEY) {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: GROQ_API_KEY });
}

// Unified Generation Function
async function generateWithMainProvider(prompt) {
    // Priority: Groq -> Gemini
    if (groq) {
        console.log("Using Groq (llama-3.3-70b-versatile)...");
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_completion_tokens: 8192, // Fixed param name for some SDK versions or just max_tokens
            });
            return completion.choices[0]?.message?.content || "";
        } catch (e) {
            console.error("Groq failed:", e.message);
            // Fallthrough to Gemini
        }
    }

    if (genAI) {
        console.log("Using Gemini (gemini-2.0-flash)...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.error("Gemini failed:", e.message);
            throw e;
        }
    }

    throw new Error("No valid AI API keys found. Please set GROQ_API_KEY or GEMINI_API_KEY in .env");
}

// Updated searchGoogle to use DuckDuckGo
// Updated searchGoogle to use SerpApi (Google)
async function searchGoogle(query) {
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    if (!SERPAPI_KEY) {
        console.error("SERPAPI_KEY is missing. Returning empty.");
        return [];
    }

    try {
        console.log("Searching Google via SerpApi...");
        const response = await axios.get(process.env.SERPAPI_URL || 'https://serpapi.com/search.json', {
            params: {
                engine: "google",
                q: query,
                api_key: SERPAPI_KEY,
                num: 5 // Get top 5 results
            }
        });

        const results = response.data.organic_results || [];
        const links = results.map(r => r.link).filter(l => l && !l.toLowerCase().includes('beyondchats.com') && !l.toLowerCase().includes('amazon.'));

        return links;
    } catch (e) {
        console.error("SerpApi Search failed:", e.message);
        if (e.response) console.error(e.response.data);
        return [];
    }
}

async function scrapeContent(url) {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $ = cheerio.load(data);
        // Remove scripts, styles
        $('script, style, nav, footer, header').remove();
        // Get paragraphs
        return $('body').text().replace(/\s+/g, ' ').trim();
    } catch (e) {
        console.error(`Failed to scrape ${url}: ${e.message}`);
        return null;
    }
}

async function updateArticle(id, content, citations) {
    console.log("Updating article in Laravel...");
    await axios.put(`${LARAVEL_API}/${id}`, {
        enhanced_content: content,
        cite1: citations[0] || null,
        cite2: citations[1] || null
    });
    console.log("Article updated successfully!");
}

async function processSingleArticle(article) {
    console.log(`Processing Article: ${article.title} (ID: ${article.id})`);

    // 2. Search Google (DuckDuckGo now)
    console.log(`Searching for: ${article.title}`);
    const searchResults = await searchGoogle(article.title);
    console.log(`Found ${searchResults.length} links for ${article.title}`);

    // 3. Scrape Top 2
    let scrapedContext = "";
    let citations = [];

    for (const link of searchResults.slice(0, 2)) {
        try {
            console.log(`Scraping: ${link}`);
            const content = await scrapeContent(link);
            if (content) {
                scrapedContext += `\n\n--- Source: ${link} ---\n${content.substring(0, 2000)}`;
                citations.push(link);
            }
        } catch (e) {
            console.error(`Failed to scrape ${link}: ${e.message}`);
        }
    }

    if (!scrapedContext) {
        console.log(`Skipping ${article.title} - No context found.`);
        return { status: 'skipped', id: article.id, reason: 'No context' };
    }

    // 4. Call LLM
    console.log(`Generating AI content for ${article.title}...`);
    const prompt = `
        You are an expert editor. 
        Original Article Title: ${article.title}
        Original Content: ${article.content.substring(0, 1000)}...

        I found some new information from the web:
        ${scrapedContext}

        Task: Rewrite the original article to include insights from the new information. 
        Make it professional, engaging, and comprehensive.
        
        IMPORTANT FORMATTING INSTRUCTIONS:
        1. Return the content as valid HTML. 
        2. Use <h2> and <h3> for headings.
        3. Use <p> for paragraphs.
        4. Use <ul> and <li> for lists.
        5. Use <strong> for emphasis.
        6. Do NOT include markdown code blocks (like \`\`\`html ... \`\`\`). Return ONLY the raw HTML string.
        
        At the VERY BOTTOM, add a "References" section listing the sources.
    `;

    let resultText = "";
    try {
        resultText = await generateWithMainProvider(prompt);
        console.log(`Generated enhanced content for ${article.title}`);
    } catch (aiError) {
        console.error(`AI Generation failed for ${article.title}`, aiError.message);
        return { status: 'failed', id: article.id, error: aiError.message };
    }

    await updateArticle(article.id, resultText, citations);
    return { status: 'success', id: article.id };
}

async function enhanceAllArticles() {
    try {
        console.log("Fetching articles from Laravel...");
        // Fetch items per_page=100 to get all meaningful ones
        const response = await axios.get(`${LARAVEL_API}?per_page=100`);
        const articles = response.data.data;

        if (!articles || articles.length === 0) {
            return { status: 'error', message: 'No articles found' };
        }

        console.log(`Found ${articles.length} articles. Starting parallel enhancement...`);

        // Run all in parallel
        const results = await Promise.all(articles.map(article => processSingleArticle(article)));

        return { status: 'success', results };

    } catch (error) {
        console.error("Global Error:", error.message);
        return { status: 'error', message: error.message };
    }
}

app.post('/enhance', async (req, res) => {
    console.log("Received batch enhancement request");
    const result = await enhanceAllArticles();
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`AI Service running on port ${PORT}`);
});
