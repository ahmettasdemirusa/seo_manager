import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'SEO-Manager-Bot/1.0' },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const links: string[] = [];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http') || href.startsWith('https'))) {
        links.push(href);
      } else if (href && href.startsWith('/')) {
        try {
            const absolute = new URL(href, url).href;
            links.push(absolute);
        } catch(e) {}
      }
    });

    // Unique links only
    const uniqueLinks = Array.from(new Set(links)).slice(0, 50); // Limit to 50 for demo

    return NextResponse.json({ links: uniqueLinks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extract links' }, { status: 500 });
  }
}
