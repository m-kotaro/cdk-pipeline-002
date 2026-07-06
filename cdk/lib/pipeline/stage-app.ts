import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { deployTokyo } from "../resources/tokyo/deploy-tokyo";
import { deployOsaka } from "../resources/osaka/deploy-osaka";

export interface AppStageProps extends cdk.StageProps {
  envName: string;
  regionName: string;
  accountCode: string;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const deployProps = {
      env: props.env,
      envName: props.envName,
      accountCode: props.accountCode,
    };

    if (props.regionName === "tokyo") {
      deployTokyo(this, deployProps);
    } else if (props.regionName === "osaka") {
      deployOsaka(this, deployProps);
    }
  }
}
