import { Device } from '@capacitor/device'

/** Ten sam kształt co odpowiednik w shop-react-native — dane muszą się zestawiać. */
export async function getDeviceInfo(): Promise<{ deviceModel: string; osVersion: string }> {
  const i = await Device.getInfo()
  return {
    deviceModel: i.model,
    osVersion: `${i.operatingSystem} ${i.osVersion}`
  }
}
