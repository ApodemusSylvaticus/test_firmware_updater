/**
 * AWS Lambda function for Cognito DefineAuthChallenge trigger.
 * Determines whether to continue the custom challenge or issue tokens.
 */
export const handler = async (event) => {
  console.log("📌 [Define Auth Challenge] Incoming event:", JSON.stringify(event, null, 2));

  const session = event.request.session || [];
  console.log("📌 [Define Auth Challenge] Current session:", JSON.stringify(session, null, 2));

  if (session.length === 0) {
    // First invocation: start custom challenge flow (e.g., magic link)
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
  } else {
    const lastChallenge = session[session.length - 1];

    if (
      lastChallenge.challengeName === "CUSTOM_CHALLENGE" &&
      lastChallenge.challengeResult === true
    ) {
      // Challenge passed, issue tokens
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else {
      // Challenge not passed yet, continue asking
      event.response.issueTokens = false;
      event.response.failAuthentication = false;
      event.response.challengeName = "CUSTOM_CHALLENGE";
    }
  }

  console.log("✅ [Define Auth Challenge] Response to Cognito:", JSON.stringify(event, null, 2));
  return event;
};