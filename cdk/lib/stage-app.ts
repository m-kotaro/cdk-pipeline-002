import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteStack } from "./stack-static-site";
import { config, StageName } from "./config";

export interface AppStageProps extends cdk.StageProps {
  stageName: StageName;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    new StaticSiteStack(this, `stack-${config.projectName}-${props.stageName}-static-site`, {
      stageName: props.stageName,
      stackName: `stack-${config.projectName}-${props.stageName}-static-site`,
    });
  }
}
