const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./web-DXpHHNGK.js","./index-WFcqcd3d.js","./index-_GJkOzB_.css"])))=>i.map(i=>d[i]);
import { r as registerPlugin, _ as __vitePreload, W as WebPlugin, b as BiometryError, C as CapacitorException, i as isBiometryErrorType } from "./index-WFcqcd3d.js";
const App = registerPlugin("App", {
  web: () => __vitePreload(() => import("./web-DXpHHNGK.js"), true ? __vite__mapDeps([0,1,2]) : void 0, import.meta.url).then((m) => new m.AppWeb())
});
class BiometricAuthBase extends WebPlugin {
  async authenticate(options) {
    try {
      await this.internalAuthenticate(options);
    } catch (error) {
      throw error instanceof CapacitorException && isBiometryErrorType(error.code) ? new BiometryError(error.message, error.code) : error;
    }
  }
  async addResumeListener(listener) {
    return App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        (async () => {
          try {
            const info = await this.checkBiometry();
            listener(info);
          } catch (error) {
            console.error(error);
          }
        })();
      }
    });
  }
}
export {
  BiometricAuthBase as B
};
