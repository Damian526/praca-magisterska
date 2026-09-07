import { Platform } from 'react-native'

/** Ten sam kształt co odpowiednik w shop-ionic — dane muszą się zestawiać. */
export function getDeviceInfo(): { deviceModel: string; osVersion: string } {
  if (Platform.OS === 'android') {
    return {
      deviceModel: Platform.constants.Model,
      osVersion: `android ${Platform.constants.Release}`,
    }
  }
  return { deviceModel: Platform.OS, osVersion: `${Platform.OS} ${Platform.Version}` }
}
