import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import {
  KMSClient,
  SignCommand
} from '@aws-sdk/client-kms';
import base64url from 'base64url';
import crypto from 'crypto';
import tar from 'tar-stream';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

// Computes SHA-256 hash
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

  const encodedSignature = base64url(Buffer.from(Signature).toString("base64"));
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// XOR-based password generation
function bitwiseXorStrings(str1, str2) {
  const reverse = (s) => s.split('').reverse().join('');
  const extract = (s) => reverse(s.replace(/\D/g, '').slice(-4));
  const num1 = parseInt(extract(str1), 10);
  const num2 = parseInt(extract(str2), 10);
  return (num1 ^ num2).toString().padStart(4, '0').slice(-4);
}

// Uploads file to S3 and returns signed URL
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

// Main Lambda handler
export const handler = async (event) => {
  const CLIENT_URL =   await getParam("/firmwareUpdater/client_url")
  const S3_FIRMWARE_TEMPORARY_STORAGE = await getParam("/firmwareUpdater/s3_firmware_temporary_storage")
  const S3_FIRMWARE_STORAGE = await getParam("/firmwareUpdater/s3_firmware_storage")

  const headers = {
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const userGroups = claims["cognito:groups"]?.split(',') || [];
    const requiredGroups = ['verified', 'can-update-firmware', 'can-change-settings'];
    const hasAccess = requiredGroups.every(g => userGroups.includes(g));
    const canSetMasterPassword = userGroups.includes("can-set-master-password");

    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized access" }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    if (!body.uuid?.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "UUID is required" }) };
    }

    if (!body.Firmware) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Firmware key is required" }) };
    }

    const [deviceClass, firmwareVersion] = body.Firmware.split('::');
    if (!firmwareVersion) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid firmware key format" }) };
    }

    const firmwareData = await s3Client.send(new GetObjectCommand({
      Bucket: S3_FIRMWARE_STORAGE,
      Key: body.Firmware
    }));
    const firmwareBuffer = await streamToBuffer(firmwareData.Body);
    const checksum = computeSHA256(firmwareBuffer);

    // Handle master password generation
    if (body.autoGenMasterPas || body.masterPas) {
      if (!canSetMasterPassword) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: "You do not have permission to set or generate master password." }),
        };
      }

      if (body.autoGenMasterPas) {
        if (!body.serialNumber || !body.coreSerialNumber) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Serial numbers are required to auto-generate password." }),
          };
        }
        body.masterPas = bitwiseXorStrings(body.serialNumber, String(body.coreSerialNumber));
        console.log(`🔐 Generated master password: ${body.masterPas}`);
      }
    }

    // Build JWT payload
    const jwtPayload = {
      checksum,
      firmwareVersion,
      deviceClass,
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

    const jwt = await sign({ alg: "RS256", typ: "JWT" }, jwtPayload);

    // Create TAR archive
    const pack = tar.pack();
    pack.entry({ name: 'payload.7z', size: firmwareBuffer.length }, firmwareBuffer);
    pack.entry({ name: 'identity.jwt', size: jwt.length }, jwt);
    pack.finalize();

    const tarBuffer = await streamToBuffer(pack);
    const fileKey = `firmwareFull/${body.uuid}.tar`;
    const downloadUrl = await uploadToS3(fileKey, tarBuffer, S3_FIRMWARE_TEMPORARY_STORAGE);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ downloadUrl }),
    };

  } catch (err) {
    console.error("❌ Internal error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: err.message
      }),
    };
  }
};
