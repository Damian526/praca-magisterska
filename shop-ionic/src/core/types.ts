export type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  deliveryTime: string;
  imageUrl: string;
  rating: number;
};

export type OrderItem = {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: 'NEW' | 'PAID' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
};

export type User = {
  id: string;
  email: string;
  fullName: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CartLine = {
  service: Service;
  quantity: number;
};
