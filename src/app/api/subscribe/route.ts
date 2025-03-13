import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { subscribeSchema } from '@/lib/schemas';

const resend = new Resend(env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const parsed = await subscribeSchema.safeParseAsync(await request.json());

    if (!parsed.success) {
      // Show field errors for invalid fields
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const response = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: env.AUDIENCE_ID
    });

    return NextResponse.json(
      { message: 'Subscription successful', data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
