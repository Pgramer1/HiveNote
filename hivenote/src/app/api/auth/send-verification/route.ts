import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUniversityEmail, sendVerificationEmail, generateVerificationToken } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate if it's a university email
    if (!isUniversityEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a valid university email address (.edu, .ac.uk, etc.)' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { error: 'This email is already registered and verified. Please sign in.' },
        { status: 400 }
      );
    }

    // Generate verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store or update verification token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
      update: {
        expires,
      },
      create: {
        identifier: email,
        token,
        expires,
      },
    });

    // Store password temporarily if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: `password:${email}`,
            token: token,
          },
        },
        update: {
          expires,
        },
        create: {
          identifier: `password:${email}`,
          token: hashedPassword,
          expires,
        },
      });
    }

    // Create or update user
    if (existingUser) {
      await prisma.user.update({
        where: { email },
        data: { 
          name: name || existingUser.name,
          isUniversityEmail: true,
        } as any,
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          name: name || null,
          isUniversityEmail: true,
        } as any,
      });
    }

    // Send verification email
    await sendVerificationEmail(email, token, name);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Error in send-verification:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }
}
