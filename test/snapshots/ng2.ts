/* tslint:disable */
/* eslint-disable */
//----------------------
// <auto-generated>
//   Generated using Swaggie (https://github.com/yhnavein/swaggie)
//   Please avoid doing any manual changes in this file
// </auto-generated>
//----------------------
// ReSharper disable InconsistentNaming
// deno-lint-ignore-file

import type { Observable } from "rxjs";
import { Injectable, Inject, Optional, InjectionToken } from "@angular/core";
import { HttpClient } from "@angular/common/http";

export const API_BASE_URL = new InjectionToken<string>("API_BASE_URL");

abstract class BaseService {
  private httpClient: HttpClient;
  private baseUrl: string;

  constructor(
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    this.httpClient = httpClient;
    this.baseUrl = baseUrl ? baseUrl : '';
  }

  protected $get<T>(url: string, options?: any): Observable<T> {
    return this.httpClient
      .get<T>(this.baseUrl + url, options)
      .pipe((response: any) => response);
  }

  protected $getAll<T>(url: string, options?: any): Observable<T[]> {
    return this.httpClient
      .get<T[]>(this.baseUrl + url, options)
      .pipe((response: any) => response);
  }

  protected $delete<T>(url: string, options?: any): Observable<T> {
    return this.httpClient
      .delete(this.baseUrl + url, options)
      .pipe((response: any) => response);
  }

  protected $post(url: string, data: any, options?: any): Observable<any> {
    return this.httpClient
      .post(this.baseUrl + url, data, options)
      .pipe((response: any) => response);
  }

  protected $patch<T>(url: string, data: any, options?: any): Observable<T> {
    return this.httpClient
      .patch(this.baseUrl + url, data, options)
      .pipe((response: any) => response);
  }

  protected $put(url: string, data: any, options?: any): Observable<any> {
    return this.httpClient
      .put(this.baseUrl + url, data, options)
      .pipe((response: any) => response);
  }
}

function paramsSerializer(params: any) {
  return encodeParams(params, null, {
    allowDots: true,
    arrayFormat: 'repeat',
  });
}

@Injectable({
  providedIn: 'root'
})
export class petService extends BaseService {
  constructor(
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    super(httpClient, baseUrl);
  }

  /**
   * @param body  
   * @return Success
   */
  addPet(
    body: Pet,
    config?: any
  ): Observable<Pet> {
    const url = `/pet?`;

    return this.$post(
      url,
      body,
      config
    );
  }

/**
   * @param apiKey (optional) (API name: api_key)
   * @param petId  
   * @return Success
   */
  deletePet(
    apiKey: string | null | undefined,
    petId: number,
    config?: any
  ): Observable<unknown> {
    const url = `/pet/${encodeURIComponent(`${petId}`)}?`;

    return this.$delete(
      url,
      config
    );
  }

/**
   * @param status (optional) 
   * @return Success
   */
  findPetsByStatus(
    status: ("available" | "pending" | "sold") | null | undefined,
    config?: any
  ): Observable<Pet[]> {
    const url = `/pet/findByStatus?${paramsSerializer({'status': status,
      })}`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param tags (optional) 
   * @return Success
   */
  findPetsByTags(
    tags: string[] | null | undefined,
    config?: any
  ): Observable<Pet[]> {
    const url = `/pet/findByTags?${paramsSerializer({'tags': tags,
      })}`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param petId  
   * @return Success
   */
  getPetById(
    petId: number,
    config?: any
  ): Observable<Pet> {
    const url = `/pet/${encodeURIComponent(`${petId}`)}?`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param body  
   * @return Success
   */
  updatePet(
    body: Pet,
    config?: any
  ): Observable<Pet> {
    const url = `/pet?`;

    return this.$put(
      url,
      new URLSearchParams(body as any),
      config
    );
  }

/**
   * @param petId  
   * @param name (optional) 
   * @param status (optional) 
   * @return Success
   */
  updatePetWithForm(
    petId: number,
    name: string | null | undefined,
    status: string | null | undefined,
    config?: any
  ): Observable<unknown> {
    const url = `/pet/${encodeURIComponent(`${petId}`)}?${paramsSerializer({'name': name,
      'status': status,
      })}`;

    return this.$post(
      url,
      null,
      config
    );
  }

/**
   * @param body (optional) 
   * @param petId  
   * @param additionalMetadata (optional) 
   * @return Success
   */
  uploadFile(
    body: File | null | undefined,
    petId: number,
    additionalMetadata: string | null | undefined,
    config?: any
  ): Observable<File> {
    const url = `/pet/${encodeURIComponent(`${petId}`)}/uploadImage?${paramsSerializer({'additionalMetadata': additionalMetadata,
      })}`;

    return this.$post(
      url,
      body,
      config
    );
  }

}

@Injectable({
  providedIn: 'root'
})
export class storeService extends BaseService {
  constructor(
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    super(httpClient, baseUrl);
  }

  /**
   * @param orderId  
   * @return Success
   */
  deleteOrder(
    orderId: number,
    config?: any
  ): Observable<unknown> {
    const url = `/store/order/${encodeURIComponent(`${orderId}`)}?`;

    return this.$delete(
      url,
      config
    );
  }

/**
   * @return Success
   */
  getInventory(
    config?: any
  ): Observable<{ [key: string]: number }> {
    const url = `/store/inventory?`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param orderId  
   * @return Success
   */
  getOrderById(
    orderId: number,
    config?: any
  ): Observable<Order> {
    const url = `/store/order/${encodeURIComponent(`${orderId}`)}?`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param body (optional) 
   * @return Success
   */
  placeOrder(
    body: Order | null | undefined,
    config?: any
  ): Observable<Order> {
    const url = `/store/order?`;

    return this.$post(
      url,
      body,
      config
    );
  }

}

@Injectable({
  providedIn: 'root'
})
export class userService extends BaseService {
  constructor(
    @Inject(HttpClient) httpClient: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    super(httpClient, baseUrl);
  }

  /**
   * @param body (optional) 
   * @return Success
   */
  createUser(
    body: User | null | undefined,
    config?: any
  ): Observable<User> {
    const url = `/user?`;

    return this.$post(
      url,
      body,
      config
    );
  }

/**
   * @param body (optional) 
   * @return Success
   */
  createUsersWithListInput(
    body: User[] | null | undefined,
    config?: any
  ): Observable<User> {
    const url = `/user/createWithList?`;

    return this.$post(
      url,
      body,
      config
    );
  }

/**
   * @param username  
   * @return Success
   */
  deleteUser(
    username: string,
    config?: any
  ): Observable<unknown> {
    const url = `/user/${encodeURIComponent(`${username}`)}?`;

    return this.$delete(
      url,
      config
    );
  }

/**
   * @param username  
   * @return Success
   */
  getUserByName(
    username: string,
    config?: any
  ): Observable<User> {
    const url = `/user/${encodeURIComponent(`${username}`)}?`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param username (optional) 
   * @param password (optional) 
   * @return Success
   */
  loginUser(
    username: string | null | undefined,
    password: string | null | undefined,
    config?: any
  ): Observable<string> {
    const url = `/user/login?${paramsSerializer({'username': username,
      'password': password,
      })}`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @return Success
   */
  logoutUser(
    config?: any
  ): Observable<unknown> {
    const url = `/user/logout?`;

    return this.$get(
      url,
      config
    );
  }

/**
   * @param body (optional) 
   * @param username  
   * @return Success
   */
  updateUser(
    body: FormData | null | undefined,
    username: string,
    config?: any
  ): Observable<unknown> {
    const url = `/user/${encodeURIComponent(`${username}`)}?`;

    return this.$put(
      url,
      body,
      config
    );
  }

}


/**
 * Serializes a params object into a query string that is compatible with different REST APIs.
 * Implementation from: https://github.com/suhaotian/xior/blob/main/src/utils.ts
 * Kudos to @suhaotian for the original implementation
 */
function encodeParams<T = any>(
  params: T,
  parentKey: string | null = null,
  options?: {
    allowDots?: boolean;
    serializeDate?: (value: Date) => string;
    arrayFormat?: 'indices' | 'repeat' | 'brackets';
  }
): string {
  if (params === undefined || params === null) return '';
  const encodedParams: string[] = [];
  const paramsIsArray = Array.isArray(params);
  const { arrayFormat, allowDots, serializeDate } = options || {};

  const getKey = (key: string) => {
    if (allowDots && !paramsIsArray) return `.${key}`;
    if (paramsIsArray) {
      if (arrayFormat === 'brackets') {
        return '[]';
      }
      if (arrayFormat === 'repeat') {
        return '';
      }
    }
    return `[${key}]`;
  };

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      let value = (params as any)[key];
      if (value !== undefined) {
        const encodedKey = parentKey ? `${parentKey}${getKey(key)}` : (key as string);

        // biome-ignore lint/suspicious/noGlobalIsNan: <explanation>
        if (!isNaN(value) && value instanceof Date) {
          value = serializeDate ? serializeDate(value) : value.toISOString();
        }
        if (typeof value === 'object') {
          // If the value is an object or array, recursively encode its contents
          const result = encodeParams(value, encodedKey, options);
          if (result !== '') encodedParams.push(result);
        } else {
          // Otherwise, encode the key-value pair
          encodedParams.push(`${encodeURIComponent(encodedKey)}=${encodeURIComponent(value)}`);
        }
      }
    }
  }

  return encodedParams.join('&');
}

export interface Order {
  id?: number;
  petId?: number;
  quantity?: number;
  shipDate?: Date;
// Order Status
  status?: ("placed" | "approved" | "delivered");
  complete?: boolean;}

export interface Customer {
  id?: number;
  username?: string;
  address?: Address[];}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;}

export interface Category {
  id?: number;
  name?: string;}

export interface User {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
// User Status
  userStatus?: number;}

export interface Tag {
  id?: number;
  name?: string;}

export interface Pet {
  id?: number;
  name: string;
  category?: Category;
  photoUrls: string[];
  tags?: Tag[];
// pet status in the store
  status?: ("available" | "pending" | "sold");}

export interface ApiResponse {
  code?: number;
  type?: string;
  message?: string;}
