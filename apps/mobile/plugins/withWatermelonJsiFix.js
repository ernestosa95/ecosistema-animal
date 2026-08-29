const { withMainApplication } = require('@expo/config-plugins');

/**
 * @morrowdigital/watermelondb-expo-plugin inyecta un import a
 * `com.facebook.react.bridge.JSIModulePackage` (y el registro de
 * WatermelonDBJSIPackage vía getJSIModulePackage()) asumiendo el template
 * viejo de MainApplication. El template Bridgeless de Expo 57
 * (ExpoReactHostFactory) no tiene ese método para overridear, así que el
 * import queda colgado -> "Unresolved reference 'JSIModulePackage'".
 * Como usamos el adapter sin JSI (ver src/db/database.ts), no hace falta
 * registrar nada acá — sólo limpiar el import roto.
 */
// Nota de orden: @expo/config-plugins ejecuta los mods de un mismo tipo
// (ej. withMainApplication) en orden INVERSO al de declaración en
// app.json — el último plugin declarado corre primero. Por eso este
// plugin va declarado ANTES que @morrowdigital/watermelondb-expo-plugin en
// app.json (así corre DESPUÉS, cuando el import roto ya fue inyectado).
module.exports = function withWatermelonJsiFix(config) {
  return withMainApplication(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .split('\n')
      .filter((line) => !line.includes('com.facebook.react.bridge.JSIModulePackage'))
      .join('\n');
    return mod;
  });
};
