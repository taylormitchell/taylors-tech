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
    const ws = new sst.aws.ApiGatewayWebSocket("TaylorsTechWS");
    ws.route("$default", "packages/backend/ws.handleDefault");
    ws.route("$connect", "packages/backend/ws.handleConnect");
    ws.route("$disconnect", "packages/backend/ws.handleDisconnect");
    ws.route("poke", { handler: "packages/backend/ws.handlePoke", link: [ws] });
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
