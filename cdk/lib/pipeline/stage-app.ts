import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { TokyoResourceStack } from "../resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../resources/osaka/stack-resource-osaka";
import { projectName } from "./env";

export interface AppStageProps extends cdk.StageProps {
  envName: string;
  regionName: string;
  accountCode: string;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const { envName, regionName, accountCode } = props;

    if (regionName === "tokyo") {
      new TokyoResourceStack(this, `stack-${projectName}-${envName}-${accountCode}-tokyo`, {
        env: props.env,
        envName: envName,
        accountCode: accountCode,
        stackName: `stack-${projectName}-${envName}-${accountCode}-tokyo`,
      });
    } else if (regionName === "osaka") {
      new OsakaResourceStack(this, `stack-${projectName}-${envName}-${accountCode}-osaka`, {
        env: props.env,
        envName: envName,
        accountCode: accountCode,
        stackName: `stack-${projectName}-${envName}-${accountCode}-osaka`,
      });
    }
  }
}
