import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  ManualApprovalStep,
} from "aws-cdk-lib/pipelines";
import { S3Trigger } from "aws-cdk-lib/aws-codepipeline-actions";
import { AppStage } from "./stage-app";
import { config } from "./config";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pj = config.projectName;

    // S3 Source Bucket を既存バケットとして参照（CFn テンプレートで作成済み）
    const sourceBucket = s3.Bucket.fromBucketName(
      this,
      "SourceBucket",
      config.sourceBucket.name
    );

    // S3 ソース（EventBridge トリガー）
    const source = CodePipelineSource.s3(sourceBucket, "source.zip", {
      trigger: S3Trigger.EVENTS,
    });

    // CodePipeline
    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `cp-${pj}-deploy`,
      crossAccountKeys: true,
      synth: new ShellStep("Synth", {
        input: source,
        commands: ["cd cdk", "npm ci", "npx cdk synth"],
        primaryOutputDirectory: "cdk/cdk.out",
      }),
    });

    // Parameter Store から Target Account 情報を取得
    const devAccountId = ssm.StringParameter.valueFromLookup(
      this,
      `${config.parameterStore.prefix}/dev/account-id`
    );
    const devRegion = ssm.StringParameter.valueFromLookup(
      this,
      `${config.parameterStore.prefix}/dev/region`
    );
    const prdAccountId = ssm.StringParameter.valueFromLookup(
      this,
      `${config.parameterStore.prefix}/prd/account-id`
    );
    const prdRegion = ssm.StringParameter.valueFromLookup(
      this,
      `${config.parameterStore.prefix}/prd/region`
    );

    // Dev Stage
    pipeline.addStage(
      new AppStage(this, "Dev", {
        env: { account: devAccountId, region: devRegion },
        stageName: config.stages.dev,
      })
    );

    // Prd Stage（手動承認付き）
    pipeline.addStage(
      new AppStage(this, "Prd", {
        env: { account: prdAccountId, region: prdRegion },
        stageName: config.stages.prd,
      }),
      {
        pre: [new ManualApprovalStep("PromoteToPrd")],
      }
    );
  }
}
