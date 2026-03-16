import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    console.log('[Reset Password] Attempting password reset with token:', token?.substring(0, 10) + '...');

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: {
          startsWith: 'reset:',
        },
      },
    });

    console.log('[Reset Password] Token found:', resetToken ? 'Yes' : 'No');

    if (!resetToken) {
      console.log('[Reset Password] Token not found in database');
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetToken.expires < new Date()) {
      console.log('[Reset Password] Token has expired');
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: resetToken.identifier,
            token: resetToken.token,
          },
        },
      });

      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Extract email from identifier
    const email = resetToken.identifier.replace('reset:', '');
    console.log('[Reset Password] Resetting password for email:', email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword } as any,
    });

    console.log('[Reset Password] Password updated successfully');

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: resetToken.identifier,
          token: resetToken.token,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully!',
    });
  } catch (error: any) {
    console.error('[Reset Password] Error:', error?.message || error);
    console.error('[Reset Password] Stack:', error?.stack);
    return NextResponse.json(
      { error: error?.message || 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
