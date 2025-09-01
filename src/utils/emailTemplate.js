// utils/emailTemplates.js

class EmailTemplates {
  static getVerificationEmailTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #007bff;">
            <h1 style="color: #007bff; margin: 0;">Welcome ${userName}!</h1>
          </div>
          
          <div style="padding: 30px 20px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              Thank you for registering! To complete your account setup, please enter the verification code below:
            </p>
            
            <div style="background: linear-gradient(135deg, #007bff, #0056b3); padding: 30px; border-radius: 10px; margin: 30px 0;">
              <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
              <h1 style="color: #ffffff; font-size: 42px; margin: 0; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⚠️ <strong>Important:</strong> This code expires in 10 minutes
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you didn't create an account with us, please ignore this email.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #28a745;">
            <h1 style="color: #28a745; margin: 0;">🎉 Welcome to Our Platform!</h1>
          </div>
          
          <div style="padding: 30px 20px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              Your email has been successfully verified! You can now enjoy full access to all our features.
            </p>
            
            <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 20px; border-radius: 10px; margin: 30px 0;">
              <h3 style="color: #ffffff; margin: 0;">✅ Account Verified</h3>
              <p style="color: #ffffff; margin: 10px 0 0 0;">You're all set to start using our platform!</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you have any questions, feel free to contact our support team.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Thank you for choosing our platform!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static getPasswordResetTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #dc3545;">
            <h1 style="color: #dc3545; margin: 0;">🔐 Password Reset</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #dc3545, #c82333); 
                        color: #ffffff; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 5px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #721c24; margin: 0; font-size: 14px;">
                ⚠️ <strong>Security Notice:</strong> This link expires in 1 hour
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              For security reasons, do not share this link with anyone.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default EmailTemplates;
