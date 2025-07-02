import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminRespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import Aes from "crypto-js/aes.js";
import Utf8 from "crypto-js/enc-utf8.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const dynamoDBClient = new DynamoDBClient({ region: "eu-central-1" });
const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-central-1" });

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
 * Decrypts an encrypted token using AES and returns the token and dbIndex.
 */
function decryptToken(encryptedToken, secretKey) {
  try {
    const decryptedBytes = Aes.decrypt(encryptedToken, secretKey);
    const decryptedText = decryptedBytes.toString(Utf8);
    if (!decryptedText) throw new Error("Invalid decrypted data");
    const [token, dbIndex] = decryptedText.split("|");
    return { token, dbIndex };
  } catch (error) {
    console.error("❌ Failed to decrypt token:", error);
    return null;
  }
}

/**
 * AWS Lambda handler to process a magic link authentication request.
 */
export const handler = async (event) => {
  const CLIENT_URL = await  getParam("/firmwareUpdater/client_url");
  const TABLE_NAME = await getParam("/firmwareUpdater/magic_link_dynamoDB_table_name");
  const CLIENT_ID = await getParam("/firmwareUpdater/cognito_client_id");
  const USER_POOL_ID = await getParam("/firmwareUpdater/cognito_user_pool");
  const SECRET_KEY = await getParam("/firmwareUpdater/auth_token_secret_key", true);



  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Credentials": "true",
  };

  console.log("Incoming request:", JSON.stringify(event, null, 2));

  // Handle CORS preflight request
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

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing request body" }),
      headers,
    };
  }

  const body = JSON.parse(event.body);
  const decrypted = decryptToken(body.token, SECRET_KEY);

  if (!decrypted) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Authentication failed" }),
      headers,
    };
  }

  const { token, dbIndex } = decrypted;
  console.log("Decrypted token and dbIndex:", { token, dbIndex });

  const { Item } = await dynamoDBClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { dbIndex: { S: dbIndex } },
    })
  );

  if (!Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Item not found" }),
      headers,
    };
  }

  console.log("Item retrieved from DynamoDB:", JSON.stringify(Item, null, 2));

  const params = {
    ClientId: CLIENT_ID,
    UserPoolId: USER_POOL_ID,
    ChallengeName: "CUSTOM_CHALLENGE",
    ChallengeResponses: {
      USERNAME: Item.username.S,
      ANSWER: token,
    },
    ClientMetadata: { dbIndex },
    Session: Item.session.S,
  };

  console.log("Calling Cognito with parameters:", JSON.stringify(params, null, 2));

  try {
    const cognitoResponse = await cognitoClient.send(
      new AdminRespondToAuthChallengeCommand(params)
    );

    console.log("✅ Cognito response:", JSON.stringify(cognitoResponse, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        AccessToken: cognitoResponse.AuthenticationResult.AccessToken,
        IdToken: cognitoResponse.AuthenticationResult.IdToken,
        RefreshToken: cognitoResponse.AuthenticationResult?.RefreshToken || "",
      }),
      headers,
    };
  } catch (error) {
    console.error("❌ Cognito error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Cognito authentication error",
        details: error.message,
      }),
      headers,
    };
  }
};