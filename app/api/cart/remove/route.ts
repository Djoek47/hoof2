import { NextRequest, NextResponse } from 'next/server';
import * as Iron from '@hapi/iron';
import { serialize, parse } from 'cookie';
import { CartItem } from '@/types/cart';

const SESSION_SECRET = process.env.SESSION_SECRET as string;
const COOKIE_NAME = 'app_session';

// Helper function to seal (encrypt) data
async function sealData(data: any) {
  return Iron.seal(data, SESSION_SECRET, Iron.defaults);
}

// Helper function to unseal (decrypt) data
async function unsealData(sealedData: string) {
  try {
    return await Iron.unseal(sealedData, SESSION_SECRET, Iron.defaults);
  } catch (error) {
    // Handle invalid or expired seals
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!SESSION_SECRET) {
    return NextResponse.json({ message: 'Server session secret not configured.' }, { status: 500 });
  }

  try {
    const { id }: { id: number } = await req.json();

    if (typeof id !== 'number') {
      return NextResponse.json({ message: 'Invalid item ID provided.' }, { status: 400 });
    }

    const cookies = parse(req.headers.get('Cookie') || '');
    const sealedCart = cookies[COOKIE_NAME];

    let cart = { items: [] as CartItem[] };

    if (sealedCart) {
      const unsealedCart = await unsealData(sealedCart);
      if (unsealedCart) {
        cart = unsealedCart as { items: CartItem[] };
      }
    }

    // Remove item from the cart
    cart.items = cart.items.filter((item) => item.id !== id);

    const newSealedCart = await sealData(cart);

    const response = NextResponse.json({ message: 'Item removed from cart successfully.' });

    // Set the updated session cookie
    response.headers.set('Set-Cookie', serialize(COOKIE_NAME, newSealedCart, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'strict',
    }));

    return response;

  } catch (error) {
    console.error('Error removing item from cart:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 