
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';

// https://medium.com/@moritzonken/enable-source-maps-for-typescript-in-aws-lambda-83f4cd91338c
// https://serverless.pub/aws-lambda-node-sourcemaps/
export const NODE_DEFAULT_PROPS = {
  environment: {
    NODE_OPTIONS: '--enable-source-maps',
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
 
export const generateItem = (movie : any ) => {
  const genreIDStrings = movie.genre_ids.map ( (id : number) => id.toString()   )
  return {
    PutRequest : {
      Item: {
        ID: { N: `${movie.id}`  },
        genre_ids: { NS: genreIDStrings },
        original_language:  { S : movie.original_language  },
        original_title:  { S : movie.original_title  },
        overview:  { S : movie.overview  },
        popularity: { N : movie.popularity.toString() },
        title:  { S : movie.title  },

      }
    }
  };
};

export const generateBatch = (data : any[]) =>  {
    return data.map(movie => generateItem(movie))

}