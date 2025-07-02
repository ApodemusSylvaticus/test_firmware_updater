import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminInitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";



const cognitoClient = new CognitoIdentityProviderClient({ region: "eu-central-1" });
const dynamoDBClient = new DynamoDBClient({ region: "eu-central-1" });
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
 * Deletes all magic link records for a given email in DynamoDB.
 */
const deleteMagicLinksByEmail = async (email, tableName) => {
  try {
    const scanResult = await dynamoDBClient.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "#email = :email",
      ExpressionAttributeNames: {
        "#email": "email",
      },
      ExpressionAttributeValues: {
        ":email": { S: email },
      },
    }));

    const itemsToDelete = scanResult.Items || [];
    console.log(`🔍 Found ${itemsToDelete.length} items to delete`);

    for (const item of itemsToDelete) {
      if (!item.dbIndex) {
        console.warn("⚠️ Skipping item with no dbIndex:", item);
        continue;
      }

      await dynamoDBClient.send(new DeleteItemCommand({
        TableName: tableName,
        Key: { dbIndex: item.dbIndex },
      }));

      console.log(`🗑️ Deleted item with dbIndex: ${item.dbIndex.S}`);
    }
  } catch (err) {
    console.error("❌ Error deleting items from DynamoDB:", err);
    throw err;
  }
};

/**
 * AWS Lambda handler to initiate a Cognito auth flow using a user's email.
 */
export const handler = async (event) => {
  const CLIENT_URL =   await getParam("/firmwareUpdater/client_url")
  const TABLE_NAME = await getParam("/firmwareUpdater/magic_link_dynamoDB_table_name")
  const CLIENT_ID = await getParam("/firmwareUpdater/cognito_client_id")
  const USER_POOL_ID = await getParam("/firmwareUpdater/cognito_user_pool")


  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight passed" }),
    };
  }

  console.log("Incoming request:", JSON.stringify(event, null, 2));

  const body = JSON.parse(event.body || "{}");
  const { email } = body;

  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Email is required" }),
    };
  }

  console.log("🔍 Looking for username by email:", email);

  const listUsersParams = {
    UserPoolId: USER_POOL_ID,
    Filter: `email = '${email.replace(/'/g, "\\'")}'`,
    Limit: 1,
  };

  let username;
  try {
    const response = await cognitoClient.send(new ListUsersCommand(listUsersParams));
    if (!response.Users || response.Users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    username = response.Users[0].Username;
    console.log(`✅ Found username: ${username}`);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error while retrieving user" }),
    };
  }

  console.log("Starting Cognito auth flow...");

  const authParams = {
    AuthFlow: "CUSTOM_AUTH",
    ClientId: CLIENT_ID,
    UserPoolId: USER_POOL_ID,
    AuthParameters: { USERNAME: username },
  };

  try {
    const command = new AdminInitiateAuthCommand(authParams);
    const response = await cognitoClient.send(command);

    console.log("✅ Cognito response:", response);

    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

    await deleteMagicLinksByEmail(email, TABLE_NAME);

    await dynamoDBClient.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        dbIndex: { S: response.ChallengeParameters.dbIndex },
        username: { S: username },
        email: { S: email },
        expiresAt: { N: expiresAt.toString() },
        used: { BOOL: false },
        session: { S: response.Session },
      },
    }));

    console.log("✅ Authentication process started. Magic link record saved.");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Check your email. Magic link sent." }),
    };
  } catch (error) {
    console.error("❌ Cognito auth error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to initiate authentication" }),
    };
  }
};
