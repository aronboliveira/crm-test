const babelJest = require("babel-jest").default;

module.exports = babelJest.createTransformer({
  presets: [
    [
      "@react-native/babel-preset",
      {
        enableBabelRuntime: false,
      },
    ],
  ],
  babelrc: false,
  configFile: false,
});
