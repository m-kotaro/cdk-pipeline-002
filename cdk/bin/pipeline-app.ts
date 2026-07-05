#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PipelineStack } from "../lib/pipeline/stack-pipeline";
import { config } from "../lib/pipeline/config";

const app = new cdk.App();

new PipelineStack(app, `stack-${config.projectName}-pipeline`, {
  env: {
    account:
      process.env.CDK_DEFAULT_ACCOUNT || config.accounts.pipeline.id,
    region: config.region,
  },
});

app.synth();
