import type { DynamoDBStreamHandler } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });

export const handler: DynamoDBStreamHandler = async (event) => {
  try {
    console.log(JSON.stringify(event));
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    const ddbDocClient = DynamoDBDocumentClient.from(
      ddbClient,
      translateConfig
    );
    for (const record of event.Records) {
      if (record.eventName === "INSERT") {
        const newFavouriteRecord = unmarshall(
          record.dynamodb?.NewImage as Record<string, AttributeValue>
        );
        const getcommandOutput = await ddbDocClient.send(
          new GetCommand({
            TableName: process.env.POPULAR_MOVIES_TABLE_NAME,
            Key: { MOVIEID: newFavouriteRecord.MovieId },
          })
        );
        if (getcommandOutput.Item === undefined) {
          await ddbDocClient.send(
            new PutCommand({
              TableName: process.env.POPULAR_MOVIES_TABLE_NAME,
              Item: {
                MOVIEID: newFavouriteRecord.MovieId,
                Popularity_Count: 1,
              },
              ConditionExpression: "attribute_not_exists(MOVIEID)",
            })
          );
        } else {
            const popularity = getcommandOutput.Item.Popularity_Count + 1
            const params = {
                TableName: process.env.POPULAR_MOVIES_TABLE_NAME,
                Key: { MOVIEID: newFavouriteRecord.MovieId },
                UpdateExpression:
                    'set #p = :new_value',
                ExpressionAttributeNames: {
                    '#p': 'Popularity_Count',
                },
                ExpressionAttributeValues: {
                    ':new_value': popularity,
                },
                ReturnValues: "ALL_NEW"
            }
            await ddbDocClient.send(new UpdateCommand(params));
        }
      }
    }
  } catch (error) {
    console.log(JSON.stringify(error));
  }
};
