import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "eu-central-1" });
const dynamoDBClient = new DynamoDBClient({ region: "eu-central-1" });

const getParam = async (name, withDecryption = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });

  const response = await ssm.send(command);
  return response.Parameter?.Value;
};

/**
 * Lambda handler to verify the user's authentication token.
 */
export const handler = async (event) => {
  console.log("Incoming request:", JSON.stringify(event, null, 2));

  const dbIndex = event.request.clientMetadata?.dbIndex;

  if (!dbIndex) {
    console.warn("❌ dbIndex not provided in clientMetadata.");
    event.response.answerCorrect = false;
    return event;
  }

  const TABLE_NAME = await getParam("/firmwareUpdater/magic_link_dynamoDB_table_name")

  const { Item } = await dynamoDBClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { dbIndex: { S: dbIndex } },
    })
  );

  console.log("Fetched item from DynamoDB:", Item);

  const isExpired = Item?.expiresAt?.N
    ? Date.now() / 1000 > parseInt(Item.expiresAt.N, 10)
    : true;
  const isAlreadyUsed = Item?.used?.BOOL === true;

  if (!Item || isExpired || isAlreadyUsed) {
    console.warn("❌ Token is invalid, expired, or already used.");
    event.response.answerCorrect = false;
    return event;
  }

  const providedAnswer = event.request.challengeAnswer;
  const expectedAnswer = event.request.privateChallengeParameters?.authToken;
  const isCorrect = providedAnswer === expectedAnswer;

  if (isCorrect) {
    await dynamoDBClient.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { dbIndex: { S: dbIndex } },
        UpdateExpression: "SET used = :val",
        ExpressionAttributeValues: {
          ":val": { BOOL: true },
        },
      })
    );
    console.log("✅ User successfully authenticated. Token marked as used.");
  } else {
    console.warn("❌ Provided answer is incorrect.");
  }

  event.response.answerCorrect = isCorrect;
  return event;
};

