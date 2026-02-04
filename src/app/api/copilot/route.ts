import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  let message = "";
  let siteData: any = {};

  try {
    const body = await request.json();
    message = body.message;
    siteData = body.siteData;

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing API Key");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = `
    You are SEO Copilot, an expert SEO consultant for the website "${siteData.domain}".
    
    SITE METRICS:
    - SEO Score: ${siteData.score}/100
    - Title: ${siteData.aiAnalysis?.data?.title || 'Missing'}
    - Description: ${siteData.aiAnalysis?.data?.description || 'Missing'}
    - Critical Issues: ${siteData.issues} found
    - Top Keyword: ${siteData.aiAnalysis?.data?.keywords?.[0]?.word || 'Unknown'}

    USER QUESTION: "${message}"

    INSTRUCTIONS:
    - Keep answers short, punchy, and actionable.
    - Use emojis.
    - Don't be generic. Use the site metrics above to give specific advice.
    `;

    const result = await model.generateContent(context);
    const reply = result.response.text();

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("AI Error:", error);
    
    // --- OFFLINE FALLBACK BRAIN ---
    let fallbackReply = "I'm having trouble connecting to the AI cloud, but I can still help! 🛠️";
    const msg = (message || "").toLowerCase();

    if (msg.includes('slow') || msg.includes('yavas') || msg.includes('hız') || msg.includes('speed')) {
        fallbackReply = `For speed, check these:\n1. Optimize images (you have ${siteData?.aiAnalysis?.data?.images?.length || 0} images).\n2. Minify CSS/JS.\n3. Use a CDN.\n\nYour current performance score is ${siteData?.aiAnalysis?.data?.scores?.performance || 'N/A'}/100.`;
    } else if (msg.includes('score') || msg.includes('puan')) {
        fallbackReply = `Your SEO Score is ${siteData?.score}/100. To improve it, focus on fixing Critical errors first!`;
    } else if (msg.includes('title') || msg.includes('başlık')) {
        fallbackReply = `Make sure your title is between 50-60 characters and includes your main keyword.\n\nCurrent title: "${siteData?.aiAnalysis?.data?.title || 'Missing'}"`;
    } else {
        fallbackReply = "I can't reach the AI cloud right now, but I recommend checking the 'Action Plan' tab for a step-by-step guide to improve your site! 🚀";
    }

    return NextResponse.json({ reply: fallbackReply });
  }
}
