import { Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { marshall } from "@aws-sdk/util-dynamodb";
// https://medium.com/@moritzonken/enable-source-maps-for-typescript-in-aws-lambda-83f4cd91338c
// https://serverless.pub/aws-lambda-node-sourcemaps/
export const NODE_DEFAULT_PROPS = {
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
  logRetention: RetentionDays.ONE_DAY,
  bundling: {
    sourceMap: true,
    minify: true,
  },
};

export const getNodejsFunctionProps = (
  props?: NodejsFunctionProps
): NodejsFunctionProps => ({
  ...NODE_DEFAULT_PROPS,
  runtime: Runtime.NODEJS_14_X,
  timeout: Duration.seconds(3),
  memorySize: 128,
  ...props,
  environment: {
    ...NODE_DEFAULT_PROPS.environment,
    ...props?.environment,
  },
});

export const generateItem = (movie: any) => {
  return {
    PutRequest: {
      Item: marshall({
        ID: movie.id,
        genre_ids: movie.genre_ids,
        original_language: movie.original_language,
        original_title: movie.original_title,
        overview: movie.overview,
        popularity: movie.popularity,
        title: movie.title,
      }),
    },
  };
};

export const generateBatch = (data: any[]) => {
  return data.map((movie) => generateItem(movie));
};
