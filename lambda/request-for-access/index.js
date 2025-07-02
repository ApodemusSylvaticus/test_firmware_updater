import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import validator from 'validator';
import fetch from 'node-fetch';

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

const validateInput = (email, additionalInfo) => {
  if (!email || !additionalInfo) {
    throw new Error("Required parameters are missing.");
  }

  if (!validator.isEmail(email)) {
    throw new Error("Invalid email format.");
  }

  const sanitizedEmail = validator.normalizeEmail(email);
  const sanitizedInfo = validator.escape(additionalInfo);

  if (sanitizedEmail.length > 100) {
    throw new Error("Email is too long.");
  }

  if (sanitizedInfo.length > 1024) {
    throw new Error("Message is too long.");
  }

  return { sanitizedEmail, sanitizedInfo };
};

const verifyRecaptcha = async (token, secretKey) => {

  const resToGoogle = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  });

  const data = await resToGoogle.json();

  if (!data.success || data.score < 0.5) {
    console.warn("reCAPTCHA failed", data);
    throw new Error("reCAPTCHA verification failed");
  }
};

const sendAccessRequestEmail = async ({recipient, info, userEmail, emailSender  }) => {
  return sesClient.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: "New Access Request",
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Additional Info:</strong></p>
              <pre>${info}</pre>
            `,
          },
        },
      },
      Source: emailSender,
    })
  );
};

export const handler = async (event) => {
  const CLIENT_URL = await getParam("/firmwareUpdater/client_url");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Credentials": "true",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...headers,
      },
      body: "",
    };
  }

  let statusCode = 400;
  let responseMessage = 'Request failed';

  try {
    const { email, additionalInfo, recaptchaToken } = JSON.parse(event.body);

    const { sanitizedEmail, sanitizedInfo } = validateInput(email, additionalInfo);

    const RECAPTCHA_SECRET_KEY = await getParam("/firmwareUpdater/recaptcha_secret_key", true);
    const EMAIL_RECIPIENT = await getParam("/firmwareUpdater/email_recipient");
    const EMAIL_SENDER = await getParam('/firmwareUpdater/email_sender');


    await verifyRecaptcha(recaptchaToken, RECAPTCHA_SECRET_KEY);
    const sesResponse = await sendAccessRequestEmail({recipient: EMAIL_RECIPIENT, info:sanitizedInfo, userEmail: sanitizedEmail, emailSender: EMAIL_SENDER  });

    if (sesResponse.MessageId) {
      statusCode = 200;
      responseMessage = 'Request sent successfully. We will contact you after manual verification.';
    } else {
      throw new Error("Email sending failed.");
    }

  } catch (error) {
    console.error("Handler error:", error);

    responseMessage = error.message;

    if (error.message.includes("reCAPTCHA")) statusCode = 403;
    else if (error.message.includes("missing") || error.message.includes("format")) statusCode = 422;
    else if (error.message.includes("Email sending")) statusCode = 502;
    else statusCode = 500;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify({ message: responseMessage }),
  };
};
