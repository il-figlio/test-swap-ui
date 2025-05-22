import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('https://transactions.pecorino.signet.sh/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    
    return NextResponse.json(
      { data }, 
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to forward request' },
      { status: 500 }
    );
  }
}