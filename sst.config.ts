/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "taylors-tech",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("TaylorsTechVpc");
    const rds = new sst.aws.Postgres("TaylorsTechRDS", { vpc });

    const ddb = new sst.aws.Dynamo("TaylorsTechWSConnections", {
      fields: { id: "string" },
      primaryIndex: { hashKey: "id" },
    });

    const ws = new sst.aws.ApiGatewayWebSocket("TaylorsTechWS");
    ws.route("$default", "packages/backend/ws.handleDefault");
    ws.route("$connect", { handler: "packages/backend/ws.handleConnect", link: [ddb] });
    ws.route("$disconnect", { handler: "packages/backend/ws.handleDisconnect", link: [ddb] });
    ws.route("poke", { handler: "packages/backend/ws.handlePoke", link: [ws, ddb] });

    const api = new sst.aws.Function("TaylorsTechAPI", {
      url: true,
      link: [rds, ws],
      handler: "packages/backend/api.handler",
      timeout: "120 seconds",
    });

    const notes = new sst.aws.StaticSite("TaylorsTechNotes", {
      path: "packages/notes",
      environment: {
        VITE_API_URL: api.url,
        VITE_TEST: "test",
        VITE_WS_URL: ws.url,
      },
      build: {
        command: "npm run build",
        output: "dist",
      },
      domain: {
        name: "notes.taylors.tech",
      },
    });

    return {
      api: api.url,
      notes: notes.url,
      ws: ws.url,
    };
  },
});
