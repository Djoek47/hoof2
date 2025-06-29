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
    const { id, quantity }: { id: number; quantity: number } = await req.json();

    if (typeof id !== 'number' || typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json({ message: 'Invalid item ID or quantity provided.' }, { status: 400 });
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

    // Find the item to update
    const itemIndex = cart.items.findIndex(item => item.id === id);

    if (itemIndex > -1) {
      if (quantity === 0) {
        // Remove item if quantity is 0
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
      }
    } else if (quantity > 0) {
        // If item not found but quantity is positive, this might indicate an issue
        // or a case where an item is added via update, handle as per desired logic.
        // For now, we'll just ignore if item not found for update.
         return NextResponse.json({ message: 'Item not found in cart.' }, { status: 404 });
    }
    // If item not found and quantity is 0, nothing to do.

    const newSealedCart = await sealData(cart);

    const response = NextResponse.json({ message: 'Cart item quantity updated successfully.' });

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
    console.error('Error updating item quantity in cart:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 