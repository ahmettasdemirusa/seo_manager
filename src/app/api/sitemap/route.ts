import { NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const agent = new https.Agent({ rejectUnauthorized: false });
    const sitemapUrl = new URL('/sitemap.xml', url).href; // Simplification, ideally we check robots.txt

    try {
        const response = await axios.get(sitemapUrl, {
            httpsAgent: agent,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
            timeout: 5000
        });

        const $ = cheerio.load(response.data, { xmlMode: true });
        const urls: string[] = [];
        
        $('loc').each((i, el) => {
            if (i < 50) urls.push($(el).text()); // Limit to 50 for display
        });

        return NextResponse.json({ urls });
    } catch (e) {
        return NextResponse.json({ urls: [] }); // Return empty if not found
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
