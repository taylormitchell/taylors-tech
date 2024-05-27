/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    TaylorsTechRDS: {
      clusterArn: string
      database: string
      secretArn: string
      type: "sst.aws.Postgres"
    }
  }
}
export {}