import * as SecureStore from "expo-secure-store";
import type { Keychain } from "./purchaseStore";

/** The real Keychain. Items stay on this phone only. */
export const keychain: Keychain = {
  get: (key) => SecureStore.getItem(key),
  set: (key, value) => SecureStore.setItem(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
};
