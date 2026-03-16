import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectUniversityFromEmail } from '@/lib/universities';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      // Token not found — it may have already been used successfully.
      // Check if a user with emailVerified exists for any identifier matching this token pattern.
      // Since we can't look up by token anymore, return a friendly alreadyVerified hint.
      return NextResponse.json(
        { 
          error: 'This verification link has already been used or is invalid.',
          alreadyVerified: true,
        },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update user's email verification status
    const university = detectUniversityFromEmail(verificationToken.identifier);
    const user = await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { 
        emailVerified: new Date(),
        isUniversityEmail: true,
        university: university?.name || null,
      } as any,
    });

    // Check if there's a stored password and set it
    const passwordToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: `password:${verificationToken.identifier}`,
      },
    });

    if (passwordToken) {
      // Set the password from the stored hash
      await prisma.user.update({
        where: { email: user.email! },
        data: { password: passwordToken.token } as any,
      });

      // Delete the password token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: passwordToken.identifier,
            token: passwordToken.token,
          },
        },
      });
    }

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      email: user.email,
    });
  } catch (error) {
    console.error('Error in verify-email:', error);
    return NextResponse.json(
      { error: 'Failed to verify email. Please try again.' },
      { status: 500 }
    );
  }
}
