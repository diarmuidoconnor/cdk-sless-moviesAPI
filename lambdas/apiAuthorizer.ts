import jwt, { Secret, JwtPayload } from "jsonwebtoken";
// See https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
export const handler = async (event: any) => {
  console.log(event);
  try {
    const token = event.authorizationToken.replace("Bearer ", "");

    if (!token) {
      throw new Error("Invalid token");
    }
    const decoded = jwt.verify(token, "ilikecake");
    console.log(decoded);
    let policy = {
      principalId: "user",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "ALLOW",
            Resource: event.methodArn,
          },
        ],
      },
    };
    return policy;
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: 'Invalid token ' }),
    };
    // res.status(401).send('Please authenticate');
  }
};
