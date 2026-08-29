// WatermelonDB usa decorators (@field, @date, @children, ...) para definir
// modelos — babel-preset-expo no los habilita por default.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
  };
};
