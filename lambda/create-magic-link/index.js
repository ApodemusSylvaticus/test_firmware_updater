import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from "uuid";
import Aes from "crypto-js/aes.js";
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const sesClient = new SESClient({ region: "eu-central-1" });
const ssm = new SSMClient({ region: "eu-central-1" });

const getParam = async (name, withDecryption = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });

  const response = await ssm.send(command);
  return response.Parameter?.Value;
};


/**
 * AWS Lambda handler to create and send a magic login link via email.
 * Triggered by Cognito "Create Auth Challenge".
 */
export const handler = async (event) => {
  const SECRET_KEY = await getParam("/firmwareUpdater/auth_token_secret_key", true);
  const EMAIL_SENDER = await getParam('/firmwareUpdater/email_sender');
  const CLIENT_URL =   await getParam("/firmwareUpdater/client_url")

  console.log("📩 Incoming event:", JSON.stringify(event, null, 2));

  const username = event.request.userAttributes?.sub;
  const email = event.request.userAttributes?.email;

  if (!email || !username) {
    throw new Error("❌ Email or username is missing from user attributes.");
  }

  // Generate magic token and dbIndex
  const token = uuidv4();
  const dbIndex = uuidv4();
  console.log("✅ Generated token:", token);

  const combinedText = `${token}|${dbIndex}`;
  const encrypted = Aes.encrypt(combinedText, SECRET_KEY).toString();
  const safeToken = encodeURIComponent(encrypted);

  console.log("✅ Encrypted token:", encrypted);
  console.log("✅ URL-safe token:", safeToken);

  // ⚠️ Replace with real frontend domain in production
  const magicLink = `${CLIENT_URL}/enter?token=${safeToken}`;
  console.log("✅ Magic link generated:", magicLink);

  // Send email via SES
  const sesResponse = await sesClient.send(
    new SendEmailCommand({
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: "Sign in with your magic link",
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome!</h2>
                <p>Click the button below to log in to your account:</p>
                <p>
                  <a 
                    href="${magicLink}" 
                    style="
                      display: inline-block;
                      padding: 10px 20px;
                      background-color: #007BFF;
                      color: white;
                      text-decoration: none;
                      border-radius: 5px;
                    ">
                    Log in with Magic Link
                  </a>
                </p>
                <p>If you didn’t request this email, you can safely ignore it.</p>
              </body>
            </html>
          `,
          },
        },
      },
      Source: EMAIL_SENDER,
    })
  );


  console.log("📨 Email sent via SES:", sesResponse);

  // Return response to Cognito
  event.response.publicChallengeParameters = {
    email,
    dbIndex,
  };

  event.response.privateChallengeParameters = {
    authToken: token,
  };

  console.log("✅ Final event object:", JSON.stringify(event, null, 2));
  return event;
};

