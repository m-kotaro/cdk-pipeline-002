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

// Derived values
export const ssmPrefix = `/${projectName}`;
export const sourceBucketName = `s3-${projectName}-${deployEnv}-${deployRegion}-source`;
export const artifactBucketName = `s3-${projectName}-${deployEnv}-${deployRegion}-artifact`;
