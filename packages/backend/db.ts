import { Resource } from "sst";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import * as schema from "./schema.sql";

export const serverId = 1;

const client = new RDSDataClient({});

export const db = drizzle(client, {
  database: Resource.TaylorsTechRDS.database,
  secretArn: Resource.TaylorsTechRDS.secretArn,
  resourceArn: Resource.TaylorsTechRDS.clusterArn,
  schema,
});
