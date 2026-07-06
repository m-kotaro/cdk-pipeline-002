// Region name to AWS region mapping
const REGION_MAP: Record<string, string> = {
  tokyo: "ap-northeast-1",
  osaka: "ap-northeast-3",
};

// Environment variables
export const projectName = process.env.PROJECT_NAME || "cp002";
export const deployEnv = process.env.DEPLOY_ENV || "dev";
export const deployRegion = process.env.DEPLOY_REGION || "tokyo";
export const awsRegion = REGION_MAP[deployRegion] || "ap-northeast-1";
export const cdkDefaultAccount = process.env.CDK_DEFAULT_ACCOUNT;

// Account codes (free-form: base, alfa, beta, etc.)
export const pipelineAccountCode = process.env.PIPELINE_ACCOUNT_CODE || "base";
export const targetAccountCode = process.env.TARGET_ACCOUNT_CODE || "alfa";

// Derived values
export const ssmPrefix = `/${projectName}/${deployEnv}/${pipelineAccountCode}`;
export const sourceBucketName = `s3-${projectName}-${deployEnv}-${pipelineAccountCode}-${deployRegion}-source`;
export const artifactBucketName = `s3-${projectName}-${deployEnv}-${pipelineAccountCode}-${deployRegion}-artifact`;
export const sourceObjectKey = `${projectName}-source-main.zip`;
export const sourceExtractDir = `${projectName}-source`;
