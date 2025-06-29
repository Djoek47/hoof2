import { NextResponse } from 'next/server';
import { uploadFile, getSignedUrl } from '@/lib/storage';
import { CartState } from '@/types/cart';

// Use a fixed cart filename
const CART_FILENAME = 'carts/cart.json';

// Empty cart template
const EMPTY_CART: CartState = {
  items: [],
  isOpen: false,
  cartUrl: `https://storage.googleapis.com/djt45test/${CART_FILENAME}`
};

export async function POST(request: Request) {
  try {
    const cartData: CartState = await request.json();
    console.log('Received cart data:', cartData);
    
    // If items array is empty, clear the cart
    if (!cartData.items || cartData.items.length === 0) {
      console.log('Clearing cart...');
      try {
        await uploadFile(
          Buffer.from(JSON.stringify(EMPTY_CART)),
          CART_FILENAME,
          'application/json'
        );
        console.log('Successfully cleared cart');
        return NextResponse.json(EMPTY_CART);
      } catch (uploadError) {
        console.error('Error clearing cart:', uploadError);
        return NextResponse.json(EMPTY_CART);
      }
    }

    // Update cart with new items
    console.log('Updating cart with new items...');
    const updatedCart = {
      ...cartData,
      cartUrl: `https://storage.googleapis.com/djt45test/${CART_FILENAME}`
    };

    try {
      await uploadFile(
        Buffer.from(JSON.stringify(updatedCart)),
        CART_FILENAME,
        'application/json'
      );
      console.log('Successfully updated cart');
      return NextResponse.json(updatedCart);
    } catch (uploadError) {
      console.error('Error updating cart:', uploadError);
      return NextResponse.json(updatedCart);
    }
  } catch (error) {
    console.error('Error storing cart:', error);
    return NextResponse.json(EMPTY_CART);
  }
}

export async function GET(request: Request) {
  try {
    console.log('Getting cart data...');
    const signedUrl = await getSignedUrl(CART_FILENAME);
    console.log('Got signed URL:', signedUrl);

    const response = await fetch(signedUrl);
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(EMPTY_CART);
      }
      throw new Error('Failed to fetch cart data');
    }
    
    const cartData: CartState = await response.json();
    console.log('Retrieved cart data:', cartData);

    // Ensure the correct cart URL is used
    return NextResponse.json({
      ...cartData,
      cartUrl: `https://storage.googleapis.com/djt45test/${CART_FILENAME}`
    });
  } catch (error) {
    console.error('Error retrieving cart:', error);
    return NextResponse.json(EMPTY_CART);
  }
} 