import { Preferences } from "@capacitor/preferences";

export const storage = {
  get: async (k: string) => (await Preferences.get({ key: k })).value,
  set: (k: string, v: string) => Preferences.set({ key: k, value: v }),
  remove: (k: string) => Preferences.remove({ key: k }),
};
