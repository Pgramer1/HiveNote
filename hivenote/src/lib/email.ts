import * as brevo from '@getbrevo/brevo';

if (!process.env.BREVO_API_KEY) {
  console.warn('⚠️  BREVO_API_KEY is not set. Email sending will fail.');
}

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

/**
 * Check if an email is a valid university email
 * This is a basic implementation - you can expand this with more domains
 */
export function isUniversityEmail(email: string): boolean {
  const universityDomains = [
    'adaniuni.ac.in',
    'yahoo.com',
    'gmail.com', // for testing purposes - remove in production
     // Allow Yahoo for testing purposes - remove in production
    // Add more university domain patterns as needed
  ];

  const emailLower = email.toLowerCase();
  return universityDomains.some(domain => emailLower.endsWith(domain));
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
  
  // Parse sender email and name
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'HiveNote';

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = { email: senderEmail, name: senderName };
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.subject = 'Verify your HiveNote account';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🐝 HiveNote</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome${name ? ` ${name}` : ''}!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for signing up with your university email. To complete your registration and access HiveNote, please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              This link will expire in 24 hours. If you didn't create an account with HiveNote, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} HiveNote. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Verification email sent successfully to:', email);
    console.log('Brevo Response:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Brevo API Error (Verification Email):', {
      error: error.message || error,
      recipient: email,
      sender: senderEmail,
    });
    throw new Error(`Failed to send verification email: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string
) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  
  // Parse sender email and name
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@example.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'HiveNote';

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = { email: senderEmail, name: senderName };
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.subject = 'Reset your HiveNote password';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🐝 HiveNote</h1>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Hi${name ? ` ${name}` : ''},
            </p>
            <p style="color: #4b5563; font-size: 16px;">
              We received a request to reset your HiveNote password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} HiveNote. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Password reset email sent successfully to:', email);
    console.log('Brevo Response:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Brevo API Error (Password Reset):', {
      error: error.message || error,
      recipient: email,
      sender: senderEmail,
    });
    throw new Error(`Failed to send password reset email: ${error.message || 'Unknown error'}`);
  }
}
