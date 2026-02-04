import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    try {
        const response = await axios.head(url, {
            timeout: 5000,
            validateStatus: (status) => status < 400 // Reject 404/500
        });
        return NextResponse.json({ ok: true, status: response.status });
    } catch (e: any) {
        if (e.response) {
            return NextResponse.json({ ok: false, status: e.response.status });
        }
        return NextResponse.json({ ok: false, status: 0 }); // Network error
    }
  } catch (error) {
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
