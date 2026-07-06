import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { projectName } from "../../pipeline/env";

export interface OsakaResourceStackProps extends cdk.StackProps {
  envName: string;
  accountCode: string;
}

export class OsakaResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OsakaResourceStackProps) {
    super(scope, id, props);

    const { envName, accountCode } = props;

    new s3.Bucket(this, "DrBucket", {
      bucketName: `s3-${projectName}-${envName}-${accountCode}-dr`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],
    });
  }
}
