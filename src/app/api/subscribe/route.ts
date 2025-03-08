import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required and must be a string' },
                { status: 400 }
            );
        }

        const response = await resend.contacts.create({
            email,
            unsubscribed: false,
            audienceId: process.env.AUDIENCE_ID as string,
        });

        return NextResponse.json(
            { message: 'Subscription successful', data: response },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error subscribing:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
} 