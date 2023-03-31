import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
      // Print Event
      console.log("Event: ", JSON.stringify(event));

      //  Get DDB DocClient client
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
      );

      // Execute Query
      const scanCommandOutput = await ddbDocClient.send(
        new ScanCommand({
          TableName: process.env.TABLE_NAME,
        })
      );
      const body = {
        data:  scanCommandOutput,
      };
      // Return Response
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      };
    } catch (error: any) {
      console.log(JSON.stringify(error));
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ error }),
      };
    }
};
