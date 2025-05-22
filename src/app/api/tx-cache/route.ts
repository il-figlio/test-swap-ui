import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('API Route: Forwarding order to transaction cache');
    console.log('Order data:', JSON.stringify(body, null, 2));
    
    const response = await fetch('https://transactions.pecorino.signet.sh/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('Transaction cache response status:', response.status);
    console.log('Transaction cache response:', responseText);
    
    // Try to parse as JSON if possible
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Transaction cache error',
          status: response.status,
          details: responseData 
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, data: responseData },
      { status: 200 }
    );
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to forward request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Test the transaction cache connectivity
  try {
    const response = await fetch('https://transactions.pecorino.signet.sh/orders', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.text();
    
    return NextResponse.json({
      message: 'Transaction cache proxy is running',
      txCacheStatus: response.status,
      txCacheResponse: data
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Transaction cache proxy is running',
      txCacheError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}