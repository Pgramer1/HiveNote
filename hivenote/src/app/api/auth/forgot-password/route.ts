import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUniversityEmail, sendPasswordResetEmail, generateVerificationToken } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json();
    const email = rawEmail?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate if it's a university email
    if (!isUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a valid university email address' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 400 }
      );
    }

    // Generate reset token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: `reset:${email}`,
          token: token,
        },
      },
      update: {
        expires,
      },
      create: {
        identifier: `reset:${email}`,
        token,
        expires,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(email, token, user.name || undefined);

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email.',
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { error: 'Failed to send reset email. Please try again.' },
      { status: 500 }
    );
  }
}
