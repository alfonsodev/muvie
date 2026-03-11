const buildMeta = require("./build-meta.json");

// Extends app.json — injects build-meta values into extra at config-read time.
// build-meta.json is populated by scripts/set-build-meta.js before eas build runs.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    gitCommit: buildMeta.gitCommit,
  },
});
