globalThis.__APP_START__ =
  (globalThis.performance && globalThis.performance.now)
    ? globalThis.performance.now()
    : Date.now()

const { AppRegistry } = require('react-native');
const App = require('./App').default;
const { name: appName } = require('./app.json');

AppRegistry.registerComponent(appName, () => App);
