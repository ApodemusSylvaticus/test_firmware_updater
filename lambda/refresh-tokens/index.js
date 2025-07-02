import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const client = new CognitoIdentityProviderClient({ region: "eu-central-1" });
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
 * AWS Lambda handler to refresh Cognito tokens using a provided refresh token.
 */
export const handler = async (event) => {
  const CLIENT_URL =   await getParam("/firmwareUpdater/client_url")
  const CLIENT_ID = await getParam("/firmwareUpdater/cognito_client_id")

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    console.log("Incoming request:", JSON.stringify(event, null, 2));

    const refreshToken = event.queryStringParameters?.token;

    if (!refreshToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Refresh token is required" }),
        headers,
      };
    }

    const command = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });

    const response = await client.send(command);
    const result = response.AuthenticationResult;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken || refreshToken
      }),
    };
  } catch (error) {
    console.error("❌ Failed to refresh tokens:", error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Invalid or expired refresh token" }),
    };
  }
};