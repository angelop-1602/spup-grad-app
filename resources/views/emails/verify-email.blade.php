<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: linear-gradient(to bottom, #036635 0%, #048a47 50%, #05a85a 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        .email-header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            font-family: 'Old English Text MT', 'Old English', serif;
        }
        .email-header p {
            margin: 8px 0 0 0;
            color: #ffffff;
            font-size: 14px;
            font-family: 'Times New Roman', Times, serif;
            opacity: 0.95;
        }
        .email-body {
            padding: 40px 30px;
            color: #111827;
        }
        .email-body h2 {
            margin: 0 0 20px 0;
            color: #111827;
            font-size: 20px;
            font-weight: 600;
        }
        .email-body p {
            margin: 0 0 20px 0;
            color: #4b5563;
            font-size: 16px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .verify-button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #fbbf24;
            color: #111827;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.3s ease;
            box-shadow: 0 2px 4px rgba(251, 191, 36, 0.3);
        }
        .verify-button:hover {
            background-color: #f59e0b;
        }
        .email-footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .email-footer p {
            margin: 0 0 10px 0;
            color: #6b7280;
            font-size: 14px;
        }
        .email-footer a {
            color: #036635;
            text-decoration: none;
            font-weight: 500;
        }
        .email-footer a:hover {
            text-decoration: underline;
            color: #048a47;
        }
        .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 30px 0;
        }
        .security-note {
            background-color: #d1fae5;
            border-left: 4px solid #036635;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-note p {
            margin: 0;
            color: #065f46;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            @if(isset($logoPath) && $logoPath)
                <!-- Embed logo using $message->embed() - most reliable method -->
                @php
                    $embeddedLogo = $message->embed($logoPath);
                @endphp
                <!--[if mso]>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 20px;">
                            <img src="{{ $embeddedLogo }}" alt="SPUP Logo" width="150" height="auto" style="display: block; border: 0;" />
                        </td>
                    </tr>
                </table>
                <![endif]-->
                <!--[if !mso]><!-->
                <img src="{{ $embeddedLogo }}" alt="SPUP Logo" class="logo" style="max-width: 150px; width: 150px; height: auto; display: block; margin: 0 auto 20px auto; border: 0; background-color: transparent; outline: none; text-decoration: none;" width="150" height="auto" />
                <!--<![endif]-->
            @else
                <!-- Fallback to URL if logo file doesn't exist -->
                <!--[if mso]>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center" style="padding-bottom: 20px;">
                            <img src="{{ $logoUrl }}" alt="SPUP Logo" width="150" height="auto" style="display: block; border: 0;" />
                        </td>
                    </tr>
                </table>
                <![endif]-->
                <!--[if !mso]><!-->
                <img src="{{ $logoUrl }}" alt="SPUP Logo" class="logo" style="max-width: 150px; width: 150px; height: auto; display: block; margin: 0 auto 20px auto; border: 0; background-color: transparent; outline: none; text-decoration: none;" width="150" height="auto" />
                <!--<![endif]-->
            @endif
            <h1>St. Paul University Philippines</h1>
            <p>Tuguegarao City, Cagayan 3500</p>
        </div>

        <!-- Body -->
        <div class="email-body">
            <h2>Verify Your Email Address</h2>
            
            <p>Hello,</p>
            
            <p>Thank you for registering for the <strong>SPUP Graduation Application</strong>. Please click the button below to verify your email address and complete your registration.</p>

            <div class="button-container">
                <a href="{{ $url }}" class="verify-button">Verify Email Address</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6; font-size: 14px;">{{ $url }}</p>

            <div class="divider"></div>

            <div class="security-note">
                <p><strong>Security Notice:</strong> This verification link will expire in 60 minutes. If you did not create an account, please ignore this email.</p>
            </div>

            <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
        </div>

        <!-- Footer -->
        <div class="email-footer">
            <p>This email was sent by <strong>{{ $appName }}</strong></p>
            <p>
                <a href="{{ $appUrl }}">Visit our website</a>
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                © {{ date('Y') }} St. Paul University Philippines. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>

