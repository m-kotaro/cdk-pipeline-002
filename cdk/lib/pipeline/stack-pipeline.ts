import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { S3Trigger } from "aws-cdk-lib/aws-codepipeline-actions";
import { AppStage } from "./stage-app";
import {
  projectName,
  deployEnv,
  deployRegion,
  awsRegion,
  ssmPrefix,
  sourceBucketName,
  artifactBucketName,
  pipelineAccountCode,
  targetAccountCode,
  sourceObjectKey,
  sourceExtractDir,
} from "./env";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameter Store から Target Account 情報を取得
    const targetAccountId = ssm.StringParameter.valueFromLookup(
      this,
      `${ssmPrefix}/target-account-id`
    );

    // クロスアカウント判定
    const isCrossAccount = this.account !== targetAccountId;

    // S3 Source Bucket を既存バケットとして参照
    const sourceBucket = s3.Bucket.fromBucketName(
      this,
      "SourceBucket",
      sourceBucketName
    );

    // Artifact Bucket（CDK で作成 - 権限が自動設定される）
    const artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      bucketName: artifactBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 ソース（EventBridge トリガー）
    const source = CodePipelineSource.s3(sourceBucket, sourceObjectKey, {
      trigger: S3Trigger.EVENTS,
    });

    // CodePipeline
    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `cp-${projectName}-${deployEnv}-${pipelineAccountCode}-${deployRegion}-deploy`,
      crossAccountKeys: isCrossAccount,
      artifactBucket: artifactBucket,
      synth: new ShellStep("Synth", {
        input: source,
        env: {
          PROJECT_NAME: projectName,
          DEPLOY_ENV: deployEnv,
          DEPLOY_REGION: deployRegion,
          PIPELINE_ACCOUNT_CODE: pipelineAccountCode,
          TARGET_ACCOUNT_CODE: targetAccountCode,
        },
        commands: [
          `cd ${sourceExtractDir}/cdk`,
          "npm ci",
          "npx cdk synth",
        ],
        primaryOutputDirectory: `${sourceExtractDir}/cdk/cdk.out`,
      }),
    });

    // Deploy Stage
    pipeline.addStage(
      new AppStage(this, "Deploy", {
        env: { account: targetAccountId, region: awsRegion },
        envName: deployEnv,
        regionName: deployRegion,
        accountCode: targetAccountCode,
      })
    );

    // Build the pipeline to get access to the underlying CodePipeline
    pipeline.buildPipeline();

    // EventBridge rule: S3 PutObject triggers pipeline
    new events.Rule(this, "S3TriggerRule", {
      ruleName: `rule-${projectName}-${deployEnv}-${pipelineAccountCode}-${deployRegion}-s3-trigger`,
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["Object Created"],
        detail: {
          bucket: {
            name: [sourceBucketName],
          },
          object: {
            key: [sourceObjectKey],
          },
        },
      },
      targets: [new targets.CodePipeline(pipeline.pipeline)],
    });
  }
}
