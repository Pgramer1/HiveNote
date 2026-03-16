import * as brevo from '@getbrevo/brevo';
import { detectUniversityFromEmail } from './universities';

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
 * Uses the centralized university configuration
 */
export function isUniversityEmail(email: string): boolean {
  return detectUniversityFromEmail(email) !== null;
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
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
            <tr>
              <td style="padding: 60px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Logo -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #9ca3af; font-size: 18px; font-weight: 400; letter-spacing: 1px;">HiveNote</h1>
                    </td>
                  </tr>
                  <!-- Mascot -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center;">
                      <div style="position: relative; display: inline-block;">
                        <span style="font-size: 120px; display: block;">🐝</span>
                        <span style="position: absolute; top: 10px; left: -20px; font-size: 24px;">✨</span>
                        <span style="position: absolute; top: 50px; right: -15px; font-size: 20px;">📚</span>
                        <span style="position: absolute; bottom: 20px; left: -15px; font-size: 18px;">💛</span>
                        <span style="position: absolute; bottom: 30px; right: -10px; font-size: 22px;">🎓</span>
                      </div>
                    </td>
                  </tr>
                  <!-- Heading -->
                  <tr>
                    <td style="padding: 20px 40px 10px 40px; text-align: center;">
                      <h2 style="margin: 0; color: #4b5563; font-size: 28px; font-weight: 700;">Verify your email</h2>
                    </td>
                  </tr>
                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 10px 60px 30px 60px; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Thanks for helping us keep your account secure!<br>
                        Click the button below to finish verifying your email address.
                      </p>
                    </td>
                  </tr>
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 60px 30px 60px; text-align: center;">
                      <a href="${verificationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
                        CONFIRM EMAIL
                      </a>
                    </td>
                  </tr>
                  <!-- Small Text -->
                  <tr>
                    <td style="padding: 0 60px 40px 60px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                        Didn't create an account? <a href="#" style="color: #3b82f6; text-decoration: none;">Click here</a> to remove this email address.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                        &copy; ${new Date().getFullYear()} HiveNote • Empowering University Students
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
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
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
            <tr>
              <td style="padding: 60px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Logo -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #9ca3af; font-size: 18px; font-weight: 400; letter-spacing: 1px;">HiveNote</h1>
                    </td>
                  </tr>
                  <!-- Mascot -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center;">
                      <div style="position: relative; display: inline-block;">
                        <span style="font-size: 120px; display: block;">🔐</span>
                        <span style="position: absolute; top: 10px; left: -20px; font-size: 24px;">🔑</span>
                        <span style="position: absolute; top: 50px; right: -15px; font-size: 20px;">⚡</span>
                        <span style="position: absolute; bottom: 20px; left: -15px; font-size: 18px;">✨</span>
                        <span style="position: absolute; bottom: 30px; right: -10px; font-size: 22px;">🛡️</span>
                      </div>
                    </td>
                  </tr>
                  <!-- Heading -->
                  <tr>
                    <td style="padding: 20px 40px 10px 40px; text-align: center;">
                      <h2 style="margin: 0; color: #4b5563; font-size: 28px; font-weight: 700;">Reset your password</h2>
                    </td>
                  </tr>
                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 10px 60px 30px 60px; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your HiveNote password.<br>
                        Click the button below to create a new password for your account.
                      </p>
                    </td>
                  </tr>
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 60px 30px 60px; text-align: center;">
                      <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
                        RESET PASSWORD
                      </a>
                    </td>
                  </tr>
                  <!-- Small Text -->
                  <tr>
                    <td style="padding: 0 60px 40px 60px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                        Didn't request this? <a href="#" style="color: #3b82f6; text-decoration: none;">Click here</a> to secure your account.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                        &copy; ${new Date().getFullYear()} HiveNote • Empowering University Students
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
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
