import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDDBDocClient } from "../shared/util";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event.body));
    const body = event?.body;
    if (!body) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No data provided" }),
      };
    }
    const userFavourite = JSON.parse(body);

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

    const getUserCommand = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE_NAME,
        Key: { USERNAME: userFavourite.username },
      })
    );
    const getMovieCommand = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.MOVIES_TABLE_NAME,
        Key: { ID: userFavourite.movieId },
      })
    );
    if (!getUserCommand?.Item || !getMovieCommand?.Item) {
      return {
        statusCode: 401,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "User/Movie not found",
        }),
      };
    }
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.FAVOURITES_TABLE_NAME,
        Item: {
          Username: userFavourite.username,
          MovieId: userFavourite.movieId,
        },
      })
    );
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "Favourite added",
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};
