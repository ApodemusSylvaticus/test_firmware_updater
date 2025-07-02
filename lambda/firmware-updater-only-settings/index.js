import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import base64url from 'base64url';
import crypto from 'crypto';
import tar from 'tar-stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: "eu-central-1" });
const s3Client = new S3Client({ region: "eu-central-1" });
const kmsClient = new KMSClient({ region: "eu-central-1" });

const keyArn = 'arn:aws:kms:eu-central-1:784089697996:key/19e81f01-07aa-4ec6-b16b-371f3a8e46dd';


const getParam = async (name, withDecryption = false) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecryption,
  });

  const response = await ssm.send(command);
  return response.Parameter?.Value;
};

// Converts a stream to a buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Computes SHA-256 hash for integrity verification
function computeSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Signs JWT using AWS KMS
async function sign(headers, payload) {
  payload.iat = Math.floor(Date.now() / 1000);
  const encodedHeader = base64url(JSON.stringify(headers));
  const encodedPayload = base64url(JSON.stringify(payload));
  const message = Buffer.from(`${encodedHeader}.${encodedPayload}`);

  const { Signature } = await kmsClient.send(new SignCommand({
    Message: message,
    KeyId: keyArn,
    SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
    MessageType: 'RAW'
  }));

  const signature = base64url(Buffer.from(Signature).toString("base64"));
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Uploads file to S3 and generates a temporary download link
async function uploadToS3(key, buffer, bucket) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/x-tar",
  }));

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 }
  );
}

// Helper to generate a password based on serial numbers
function bitwiseXorStrings(str1, str2) {
  const reverse = (str) => str.split('').reverse().join('');

  const extractLastDigits = (str) => reverse(str.replace(/\D/g, '').slice(-4));

  const num1 = parseInt(extractLastDigits(str1), 10);
  const num2 = parseInt(extractLastDigits(str2), 10);

  return (num1 ^ num2).toString().padStart(4, '0').slice(-4);
}

// Main Lambda handler
export const handler = async (event) => {
  const CLIENT_URL =   await getParam("/firmwareUpdater/client_url");
  const S3_FIRMWARE_TEMPORARY_STORAGE = await getParam("/firmwareUpdater/s3_firmware_temporary_storage");

  const headers = {
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    // Validate Cognito claims
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.email) {
      return { headers, statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const userGroups = claims["cognito:groups"]?.split(',') || [];
    const requiredGroups = ['verified', 'can-change-settings'];
    const canSetMasterPassword = userGroups.includes("can-set-master-password");

    if (!requiredGroups.every(g => userGroups.includes(g))) {
      return { headers, statusCode: 403, body: JSON.stringify({ error: "Unauthorized access" }) };
    }

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');

    if (!body.uuid || body.uuid.trim() === "") {
      return { headers, statusCode: 400, body: JSON.stringify({ error: "UUID is required." }) };
    }

    // Generate master password if required
    if (body.autoGenMasterPas || body.masterPas) {
      if (!canSetMasterPassword) {
        return { headers, statusCode: 403, body: JSON.stringify({ error: "You do not have permission to set or generate a master password." }) };
      }

      if (body.autoGenMasterPas) {
        if (!body.serialNumber || !body.coreSerialNumber) {
          return { headers, statusCode: 400, body: JSON.stringify({ error: "Serial numbers required for password generation." }) };
        }
        body.masterPas = bitwiseXorStrings(body.serialNumber, String(body.coreSerialNumber));

        console.log(`🔐 Auto-generated master password: ${body.masterPas}`);
      }
    }

    // Create payload for JWT
    const payload = {
      checksum: '',
      firmwareVersion: "",
      deviceName: body.deviceName || "",
      serialNumber: body.serialNumber || "",
      manufactureDate: body.manufactureDate || "",
      coreSerialNumber: body.coreSerialNumber || "",
      lrfSerialNumber: body.lrfSerialNumber || "",
      clickX: Number(body.clickX) || 0,
      clickY: Number(body.clickY) || 0,
      masterPas: parseInt(body.masterPas, 10) || 0,
      vcom: parseInt(body.vcom, 10) || 0,
      uuid: body.uuid || "",
    };

    // Sign JWT
    const jwt = await sign({ alg: "RS256", typ: "JWT" }, payload);

    // Create TAR with the JWT inside
    const pack = tar.pack();
    pack.entry({ name: 'identity.jwt', size: jwt.length }, jwt);
    pack.finalize();
    const tarBuffer = await streamToBuffer(pack);

    // Upload to S3
    const key = `firmwareSettings/${body.uuid}.tar`;
    const downloadUrl = await uploadToS3(key, tarBuffer, S3_FIRMWARE_TEMPORARY_STORAGE);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ downloadUrl }),
    };

  } catch (err) {
    console.error("❌ Internal error:", err);
    return {
      headers,
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message })
    };
  }
};
