import type { DynamoDBStreamHandler } from "aws-lambda";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

// const sns = new AWS.SNS();
const EmailClient = new SESClient({ region: process.env.REGION });

export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    console.log("event : ", JSON.stringify(event));
    for (const record of event.Records) {
      if (record.eventName == "INSERT") {
        const dbRecord = unmarshall(
          record.dynamodb?.NewImage as Record<string, AttributeValue>
        );
        const params = getParams(dbRecord.email);
        await EmailClient.send(new SendEmailCommand(params));
      }
    }
  } catch (error) {
    console.log(JSON.stringify(error));
  }
};

const getParams = (destination: string) => {
  return {
    Destination: {
      ToAddresses: [destination],
    },
    Message: {
      /* required */
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: "Thanks for registering",
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Registration confirmation",
      },
    },
    Source: "doconnor@wit.ie",
  };
};
