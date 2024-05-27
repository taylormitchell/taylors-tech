import { Resource } from "sst";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  driver: "aws-data-api",
  dialect: "postgresql",
  dbCredentials: {
    database: Resource.TaylorsTechRDS.database,
    secretArn: Resource.TaylorsTechRDS.secretArn,
    resourceArn: Resource.TaylorsTechRDS.clusterArn,
  },
  // Pick up all our schema files
  schema: ["./packages/backend/*.sql.ts"],
  out: "./packages/backedn/migrations",
});
