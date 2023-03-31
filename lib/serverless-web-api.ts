import {
  RemovalPolicy,
  Duration,
  Stack,
  StackProps,
  CfnOutput,
} from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  Table,
  StreamViewType,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { getNodejsFunctionProps, generateBatch } from "../shared/util";
import movies from "../seed/movies";
// ---------------------------------
import {
  SqsEventSource,
  DynamoEventSource,
} from "aws-cdk-lib/aws-lambda-event-sources";

import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CDKContext, LambdaStackProps } from "../shared/types";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { DynamoAttributeValue } from "aws-cdk-lib/aws-stepfunctions-tasks";

export class ServerlessStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps,
    context: CDKContext
  ) {
    super(scope, id, props);

    const moviesTable = new Table(this, "MoviesTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "ID", type: AttributeType.NUMBER },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: "Movies",
    });

    // Seed the movies table
    new AwsCustomResource(this, "ddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesTable.tableName]: generateBatch(movies),
          },
        },
        physicalResourceId: PhysicalResourceId.of("ddbInitData"), //.of(Date.now().toString()),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesTable.tableArn],
      }),
    });
    // const imagesBucket = new s3.Bucket(this, "images", {
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    //   publicReadAccess: false,
    // });

    // const thumbnailImagesBucket = new s3.Bucket(this, "thumbnail-images", {
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // const newReviewTopic = new sns.Topic(this, 'NewReviewTopic', {
    //   displayName: 'New Reviews topic',
    // });

    // const queue = new sqs.Queue(this, "MySqsQueue");
    // const comprehendQueue = new sqs.Queue(this, "Comprehend Queue");

    // const sharpLayer = new lambda.LayerVersion(this, "sharp-layer", {
    //   compatibleRuntimes: [
    //     lambda.Runtime.NODEJS_12_X,
    //     lambda.Runtime.NODEJS_14_X,
    //   ],
    //   code: lambda.Code.fromAsset("layers/sharp-utils"),
    //   description: "Uses a 3rd party library called sharp",
    // });

    // const newImageEventSource = new SqsEventSource(queue);
    // const newReviewEventSource = new SqsEventSource(comprehendQueue);

    const readMoviesFn = new NodejsFunction(
      this,
      "ReadMoviesFn",
      getNodejsFunctionProps({
        entry: `${__dirname}/../lambdas/readMovies.ts`,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: context.region,
        },
      })
      // role: lambdaRole,
    );

    // Permission
    moviesTable.grantReadData(readMoviesFn)
    
    // const getMoviesFn = new NodejsFunction(this, "GetMoviesFn", {
    //   // architecture: Architecture.ARM_64,
    //   runtime: lambda.Runtime.NODEJS_14_X,
    //   // handler: 'app.handler',
    //   timeout: Duration.seconds(5),
    //   memorySize: 128,
    //   entry: `${__dirname}/fns/resizeImage.ts`,
    //   environment: {
    //     BUCKET_NAME: thumbnailImagesBucket.bucketName,
    //   },
    //   // role: lambdaRole,
    //   logRetention: RetentionDays.ONE_WEEK,
    //   bundling: {
    //     minify: false,
    //     // layers that are already available in the lambda env
    //     externalModules: ["aws-sdk", "sharp"],
    //   },
    //   layers: [sharpLayer],
    // });

    // // Save review to DDB and push it to SQS
    // const saveReviewFn = new NodejsFunction(this, "SaveReviewFn", {
    //   architecture: Architecture.ARM_64,
    //   entry: `${__dirname}/fns/saveReview.ts`,
    //   environment: {
    //     DDB_TABLE: reviewsTable.tableName,
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // const apiAuthorizerFn = new NodejsFunction(this, "APIAuthorizerFn", {
    //   architecture: Architecture.ARM_64,
    //   entry: `${__dirname}/fns/apiAuthorizer.ts`,
    //   environment: {
    //     USER_POOL_ID: props.userPool ? props.userPool.userPoolId : "UNKNOWN",
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // // Save review to DDB and push it to SQS
    // const getFestivalsFn = new NodejsFunction(this, "GetFestivalsFn", {
    //   architecture: Architecture.ARM_64,
    //   entry: `${__dirname}/fns/getFestivals.ts`,
    //   environment: {
    //     DDB_TABLE: festivalsTable.tableName,
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // const addFestivalFn = new NodejsFunction(this, "AddFestivalFn", {
    //   architecture: Architecture.ARM_64,
    //   entry: `${__dirname}/fns/addFestival.ts`,
    //   environment: {
    //     DDB_TABLE: festivalsTable.tableName,
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // const publishReviewFn = new NodejsFunction(this, "PublishReviewFn", {
    //   architecture: Architecture.ARM_64,
    //   timeout: Duration.seconds(3),
    //   memorySize: 128,
    //   entry: `${__dirname}/fns/publishReviewToSNS.ts`,
    //   environment: {
    //     SNS_ARN: newReviewTopic.topicArn,
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // const transcribeReviewFn = new NodejsFunction(this, "TranscribewFn", {
    //   architecture: Architecture.ARM_64,
    //   timeout: Duration.seconds(3),
    //   memorySize: 128,
    //   entry: `${__dirname}/fns/translateReview.ts`,
    //   environment: {
    //     SNS_ARN: newReviewTopic.topicArn,
    //   },
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // const comprehendReviewFn = new NodejsFunction(this, "ComprehendFn", {
    //   architecture: Architecture.ARM_64,
    //   timeout: Duration.seconds(3),
    //   memorySize: 128,
    //   entry: `${__dirname}/fns/comprehendReview.ts`,
    //   logRetention: RetentionDays.ONE_WEEK,
    // });
    // PERMISSIONS
    // queue.grantSendMessages(saveReviewFn);
    // comprehendQueue.grantConsumeMessages(comprehendReviewFn);
    // imagesBucket.grantWrite(saveImageFn);
    // imagesBucket.grantRead(resizeImageFn);
    // thumbnailImagesBucket.grantWrite(resizeImageFn);
    // // festivalsTable.grantReadData(readAllFestivalsFn);
    // reviewsTable.grantWriteData(saveReviewFn);
    // festivalsTable.grantReadData(getFestivalsFn);
    // festivalsTable.grantWriteData(addFestivalFn);
    // newReviewTopic.grantPublish(publishReviewFn)

    // transcribeReviewFn.addToRolePolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     resources: ["*"],
    //     actions: ["translate:TranslateText"],
    //   })
    // );

    // comprehendReviewFn.addToRolePolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     resources: ["*"],
    //     actions: ["comprehend:*"],
    //   })
    // );

    // // EVENTS
    // // translateReviewsFn.addEventSource(newImageEventSource);
    //     comprehendReviewFn.addEventSource(newReviewEventSource);
    // publishReviewFn.addEventSource(
    //   new DynamoEventSource(reviewsTable, {
    //     startingPosition: StartingPosition.LATEST,
    //   })
    // );

    // imagesBucket.addEventNotification(
    //   s3.EventType.OBJECT_CREATED,
    //   new s3n.LambdaDestination(resizeImageFn),
    //   // 👇 only invoke lambda if object matches the filter
    //   { prefix: "images/", suffix: ".png" }
    // );
    // imagesBucket.addEventNotification(
    //   s3.EventType.OBJECT_CREATED,
    //   new s3n.LambdaDestination(resizeImageFn),
    //   // 👇 only invoke lambda if object matches the filter
    //   { prefix: "images/", suffix: ".jpeg" }
    // );

    // newReviewTopic.addSubscription(new subs.LambdaSubscription(transcribeReviewFn));
    // newReviewTopic.addSubscription(new subs.SqsSubscription(comprehendQueue));

    // // API

    // // Define API Authorizer
    // const apiAuthorizer = new HttpLambdaAuthorizer(
    //   "apiAuthorizer",
    //   apiAuthorizerFn,
    //   {
    //     authorizerName: `${context.appName}-http-api-authorizer-${context.environment}`,
    //     responseTypes: [HttpLambdaResponseType.SIMPLE],
    //   }
    // );

    // const api = new HttpApi(this, "FestivalsAPI", {
    //   apiName: `${context.appName}-api-${context.environment}`,
    //   description: `HTTP API Demo - ${context.environment}`,
    //   corsPreflight: {
    //     allowHeaders: ["Authorization", "Content-Type"],
    //     allowMethods: [
    //       CorsHttpMethod.GET,
    //       CorsHttpMethod.POST,
    //       CorsHttpMethod.OPTIONS,
    //     ],
    //     allowOrigins: ["*"],
    //   },
    //   defaultAuthorizer: apiAuthorizer,
    // });

    // // const readAllFestivalsIntegration = new HttpLambdaIntegration(
    // //   "ReadAllFestivalsIntegration",
    // //   readAllFestivalsFn
    // // );

    // const getFestivalsIntegration = new HttpLambdaIntegration(
    //   "GetFestivalsIntegration",
    //   getFestivalsFn
    // );

    // const addFestivalIntegration = new HttpLambdaIntegration(
    //   "AddFestivalIntegration",
    //   addFestivalFn
    // );

    // const saveReviewIntegration = new HttpLambdaIntegration(
    //   "WriteReviewIntegration",
    //   saveReviewFn
    // );

    // const saveImageIntegration = new HttpLambdaIntegration(
    //   "SaveImageIntegration",
    //   saveImageFn
    // );

    // // api.addRoutes({
    // //   integration: readAllFestivalsIntegration,
    // //   methods: [HttpMethod.GET],
    // //   path: "/reviews",
    // // });

    // api.addRoutes({
    //   integration: getFestivalsIntegration,
    //   methods: [HttpMethod.GET],
    //   path: "/festivals",
    //   // authorizer: apiAuthorizer
    // });

    // api.addRoutes({
    //   integration: addFestivalIntegration,
    //   methods: [HttpMethod.POST],
    //   path: "/festivals",
    // });

    // api.addRoutes({
    //   integration: saveReviewIntegration,
    //   methods: [HttpMethod.POST],
    //   path: "/reviews",
    // });

    // api.addRoutes({
    //   integration: saveImageIntegration,
    //   methods: [HttpMethod.POST],
    //   path: "/images",
    // });

    // OUTPUTS

    //   new CfnOutput(this, 'snsTopicArn', {
    //     value: newReviewTopic.topicArn,
    //     description: 'The arn of the SNS topic',
    //   })

    //   new CfnOutput(this, "HttpApiUrl", { value: api.apiEndpoint });
    // }
    // const lambdaRole = new aws_iam.Role(this, 'QueueConsumerFunctionRole', {
    //   assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    //   managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaSQSQueueExecutionRole'),
    //                     aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')]
    // });
  }
}
