#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PipelineStack } from "../lib/pipeline/stack-pipeline";
import { projectName, deployEnv, deployRegion, awsRegion } from "../lib/pipeline/env";

const app = new cdk.App();

new PipelineStack(app, `stack-${projectName}-${deployEnv}-${deployRegion}-pipeline`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: awsRegion,
  },
});

app.synth();
