import { B as BiometricAuthBase } from "./base-DhSUV3Ni.js";
import { a as BiometryErrorType, B as BiometryType } from "./index-WFcqcd3d.js";
class BiometricAuthNative extends BiometricAuthBase {
  constructor(capProxy) {
    super();
    const proxy = capProxy;
    this.checkBiometry = proxy.checkBiometry;
    this.internalAuthenticate = proxy.internalAuthenticate;
  }
  // @native
  async checkBiometry() {
    return {
      isAvailable: false,
      strongBiometryIsAvailable: false,
      biometryType: BiometryType.none,
      biometryTypes: [],
      deviceIsSecure: false,
      reason: "",
      code: BiometryErrorType.none,
      strongReason: "",
      strongCode: BiometryErrorType.none
    };
  }
  // @native
  // On native platforms, this will present the native authentication UI.
  async internalAuthenticate(_options) {
  }
  // Web only, used for simulating biometric authentication.
  async setBiometryType(_type) {
    console.warn("setBiometryType() is web only");
  }
  // Web only, used for simulating biometry enrollment.
  async setBiometryIsEnrolled(_enrolled) {
    console.warn("setBiometryEnrolled() is web only");
  }
  // Web only, used for simulating device security.
  async setDeviceIsSecure(_isSecure) {
    console.warn("setDeviceIsSecure() is web only");
  }
}
export {
  BiometricAuthNative
};
