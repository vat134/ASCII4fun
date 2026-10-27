const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  developmentEnvironment
} = require("./tools/development-environment.cjs");

module.exports = (app) => {
  app.use(
    createProxyMiddleware({
      pathFilter: "/api",
      target: developmentEnvironment.ASCII4FUN_SERVER_URL
    })
  );
};
