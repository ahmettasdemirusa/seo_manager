import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || ''); 

export async function POST(request: Request) {
  try {
    const { type, content, current } = await request.json();
    
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'AI Key missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let prompt = "";
    if (type === 'title') {
        prompt = `Write a perfect SEO Title (max 60 chars) for a page with this content: "${content.slice(0, 500)}...". Current title: "${current}". Return ONLY the title text.`;
    } else if (type === 'description') {
        prompt = `Write a compelling SEO Meta Description (140-160 chars) for a page with this content: "${content.slice(0, 500)}...". It must be catchy and include keywords. Return ONLY the description text.`;
    } else if (type === 'h1') {
        prompt = `Write a single, powerful H1 heading for this content: "${content.slice(0, 500)}...". Return ONLY the heading text.`;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/"/g, '').trim();

    return NextResponse.json({ result: text });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
