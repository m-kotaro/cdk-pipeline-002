import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { AppStage } from "./stage-app";
import { config } from "./config";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pj = config.projectName;

    // GitHub connection ARN - imported from CloudFormation stack export
    const connectionArn = cdk.Fn.importValue(`${pj}-codeconnection-arn`);

    const source = CodePipelineSource.connection(config.repository, config.branch, {
      connectionArn,
    });

    // CodePipeline: cp-[project]-deploy
    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `cp-${pj}-deploy`,
      synth: new ShellStep("Synth", {
        input: source,
        commands: ["cd cdk", "npm ci", "npx cdk synth"],
        primaryOutputDirectory: "cdk/cdk.out",
      }),
    });

    const account = this.account;
    const region = config.region;

    // Dev stage
    pipeline.addStage(
      new AppStage(this, "Dev", {
        env: { account, region },
        stageName: config.stages.dev,
      })
    );

    // Prd stage (with manual approval)
    pipeline.addStage(
      new AppStage(this, "Prd", {
        env: { account, region },
        stageName: config.stages.prd,
      }),
      {
        pre: [new cdk.pipelines.ManualApprovalStep("PromoteToPrd")],
      }
    );
  }
}
