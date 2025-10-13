import { NextResponse } from 'next/server';
import { getVapidKey } from 'src/actions/push-notifications';

export async function GET() {
  const result = await getVapidKey();
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ publicKey: result.publicKey });
}

