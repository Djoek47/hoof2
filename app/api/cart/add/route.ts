import { NextRequest, NextResponse } from 'next/server';
import * as Iron from '@hapi/iron';
import { serialize, parse } from 'cookie';
import { CartItem } from '@/types/cart';
import { hoodies } from '@/data/products'; // Import product data

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
    // Expect only id and quantity from the request body
    const { id, quantity }: { id: number; quantity: number } = await req.json();

    if (typeof id !== 'number' || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ message: 'Invalid item ID or quantity provided.' }, { status: 400 });
    }

    // Find the product in your product data
    const productToAdd = hoodies.find(hoodie => hoodie.id === id);

    if (!productToAdd) {
        return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
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

    // Create the cart item with full product details
    const item: CartItem = {
        id: productToAdd.id,
        name: productToAdd.name,
        price: productToAdd.price,
        quantity: quantity,
        image1: productToAdd.image1, // Include image URLs
        image2: productToAdd.image2,
    };

    // Add or update item in the cart
    const existingItemIndex = cart.items.findIndex((cartItem) => cartItem.id === item.id);

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    const newSealedCart = await sealData(cart);

    const response = NextResponse.json({ message: 'Item added to cart successfully.' });

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
    console.error('Error adding item to cart:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 