// react-native
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  get: (k: string) => AsyncStorage.getItem(k),
  set: (k: string, v: string) => AsyncStorage.setItem(k, v),
  remove: (k: string) => AsyncStorage.removeItem(k),
};
