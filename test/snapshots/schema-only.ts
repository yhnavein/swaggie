export type Order = {
  id?: number;
  petId?: number;
  quantity?: number;
  shipDate?: Date;
/** Order Status */
  status?: "placed" | "approved" | "delivered";
  complete?: boolean;};

export type Customer = {
  id?: number;
  username?: string;
  address?: Address[] | null;};

export type Address = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;};

export type Category = {
  id?: number;
  name?: string;};

export type User = {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string | null;
/** User Status */
  userStatus?: number;};

export type Tag = {
  id?: number;
  name?: string;};

export type Pet = {
  id?: number;
  name: string;
  category?: Category;
  photoUrls: string[] | null;
  tags?: Tag[];
/** pet status in the store */
  status?: "available" | "pending" | "sold";};

export type ApiResponse = {
  code?: number;
  type?: string;
  message?: string;};
