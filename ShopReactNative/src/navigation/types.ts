import type { Service } from '../core/types';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Catalog: undefined;
  Search: undefined;
  ServiceDetail: { serviceId: string; measureStart?: number };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
};
