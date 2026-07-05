import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { config, StageName } from "../../pipeline/config";

export interface TokyoResourceStackProps extends cdk.StackProps {
  stageName: StageName;
}

export class TokyoResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TokyoResourceStackProps) {
    super(scope, id, props);

    const pj = config.projectName;
    const { stageName } = props;

    new s3.Bucket(this, "SampleBucket", {
      bucketName: `s3-${pj}-${stageName}-sample`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new sqs.Queue(this, "SampleQueue", {
      queueName: `sqs-${pj}-${stageName}-sample`,
      retentionPeriod: cdk.Duration.days(4),
    });
  }
}
