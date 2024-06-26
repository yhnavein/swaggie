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

import Axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import useSWR, { SWRConfiguration, Key } from 'swr';

export const axios = Axios.create({
  baseURL: '',
});

interface SwrConfig extends SWRConfiguration {
  /* Custom key for SWR. You don't have to worry about this as by default it's the URL. You can use standard SWR Key here if you need more flexibility. */
  key?: Key;

  /* Configuration for axios fetcher */
  axios?: AxiosRequestConfig;
}
export const petClient = {
    /**
   * @param body  
   */
  addPet(  body: Pet ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/pet';


    return axios.request<unknown>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

    /**
   * @param apiKey (optional) (API name: api_key)
   * @param petId  
   */
  deletePet(  apiKey: string  | null | undefined,
      petId: number ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/pet/{petId}';

    url = url.replace('{petId}', encodeURIComponent("" + petId));

    return axios.request<unknown>({
      url: url,
      method: 'DELETE',
      headers: {
                'api_key': apiKey,
              },
      ...$config,
    });
  },

    /**
   * @param status  
   */
  findPetsByStatus(  status: ('available'|'pending'|'sold')[] ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<Pet[]> {
    let url = '/pet/findByStatus';


    return axios.request<Pet[]>({
      url: url,
      method: 'GET',
      params: {
            'status': serializeQueryParam(status),
          },
      ...$config,
    });
  },

    /**
   * @param tags  
   */
  findPetsByTags(  tags: string[] ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<Pet[]> {
    let url = '/pet/findByTags';


    return axios.request<Pet[]>({
      url: url,
      method: 'GET',
      params: {
            'tags': serializeQueryParam(tags),
          },
      ...$config,
    });
  },

    /**
   * @param petId  
   */
  getPetById(  petId: number ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<Pet> {
    let url = '/pet/{petId}';

    url = url.replace('{petId}', encodeURIComponent("" + petId));

    return axios.request<Pet>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },

    /**
   * @param body  
   */
  updatePet(  body: Pet ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/pet';


    return axios.request<unknown>({
      url: url,
      method: 'PUT',
      data: body,
      ...$config,
    });
  },

    /**
   * @param petId  
   * @param name (optional) 
   * @param status (optional) 
   */
  updatePetWithForm(  petId: number ,
      name: string  | null | undefined,
      status: string  | null | undefined,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/pet/{petId}';

    url = url.replace('{petId}', encodeURIComponent("" + petId));
    const formDataBody = new FormData();
      if (!!name) {
          formDataBody.append("name", name);
        }
    if (!!status) {
          formDataBody.append("status", status);
        }

    return axios.request<unknown>({
      url: url,
      method: 'POST',
      data: formDataBody,
      ...$config,
    });
  },

    /**
   * @param petId  
   * @param additionalMetadata (optional) 
   * @param file (optional) 
   */
  uploadFile(  petId: number ,
      additionalMetadata: string  | null | undefined,
      file: File  | null | undefined,
      $config?: AxiosRequestConfig
  ): AxiosPromise<ApiResponse> {
    let url = '/pet/{petId}/uploadImage';

    url = url.replace('{petId}', encodeURIComponent("" + petId));
    const formDataBody = new FormData();
      if (!!additionalMetadata) {
          formDataBody.append("additionalMetadata", additionalMetadata);
        }
    if (!!file) {
          formDataBody.append("file", file);
        }

    return axios.request<ApiResponse>({
      url: url,
      method: 'POST',
      data: formDataBody,
      ...$config,
    });
  },

  };

  /**
   * @param status  
   */
export function usepetfindPetsByStatus(  status: ('available'|'pending'|'sold')[] ,
      $config?: SwrConfig
  ) {
  let url = '/pet/findByStatus';
  const { axios: $axiosConf, key, ...config } = $config || {};


  let cacheUrl = url + '?';
  if (!!status) {
    cacheUrl += `status=${status}&`;
  }

  const { data, error, mutate } = useSWR<Pet[]>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    params: {
        'status': serializeQueryParam(status),
      },
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  /**
   * @param tags  
   */
export function usepetfindPetsByTags(  tags: string[] ,
      $config?: SwrConfig
  ) {
  let url = '/pet/findByTags';
  const { axios: $axiosConf, key, ...config } = $config || {};


  let cacheUrl = url + '?';
  if (!!tags) {
    cacheUrl += `tags=${tags}&`;
  }

  const { data, error, mutate } = useSWR<Pet[]>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    params: {
        'tags': serializeQueryParam(tags),
      },
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  /**
   * @param petId  
   */
export function usepetPetById(  petId: number ,
      $config?: SwrConfig
  ) {
  let url = '/pet/{petId}';
  const { axios: $axiosConf, key, ...config } = $config || {};

  url = url.replace('{petId}', encodeURIComponent("" + petId));

  let cacheUrl = url + '?';
const { data, error, mutate } = useSWR<Pet>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  export const storeClient = {
    /**
   * @param orderId  
   */
  deleteOrder(  orderId: number ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/store/order/{orderId}';

    url = url.replace('{orderId}', encodeURIComponent("" + orderId));

    return axios.request<unknown>({
      url: url,
      method: 'DELETE',
      ...$config,
    });
  },

    /**
   */
  getInventory(  $config?: AxiosRequestConfig
  ): AxiosPromise<{ [key: string]: number }> {
    let url = '/store/inventory';


    return axios.request<{ [key: string]: number }>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },

    /**
   * @param orderId  
   */
  getOrderById(  orderId: number ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<Order> {
    let url = '/store/order/{orderId}';

    url = url.replace('{orderId}', encodeURIComponent("" + orderId));

    return axios.request<Order>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },

    /**
   * @param body  
   */
  placeOrder(  body: Order ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<Order> {
    let url = '/store/order';


    return axios.request<Order>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

  };

  /**
   */
export function usestoreInventory(  $config?: SwrConfig
  ) {
  let url = '/store/inventory';
  const { axios: $axiosConf, key, ...config } = $config || {};


  let cacheUrl = url + '?';
const { data, error, mutate } = useSWR<{ [key: string]: number }>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  /**
   * @param orderId  
   */
export function usestoreOrderById(  orderId: number ,
      $config?: SwrConfig
  ) {
  let url = '/store/order/{orderId}';
  const { axios: $axiosConf, key, ...config } = $config || {};

  url = url.replace('{orderId}', encodeURIComponent("" + orderId));

  let cacheUrl = url + '?';
const { data, error, mutate } = useSWR<Order>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  export const userClient = {
    /**
   * @param body  
   */
  createUser(  body: User ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user';


    return axios.request<unknown>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

    /**
   * @param body  
   */
  createUsersWithArrayInput(  body: User[] ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user/createWithArray';


    return axios.request<unknown>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

    /**
   * @param body  
   */
  createUsersWithListInput(  body: User[] ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user/createWithList';


    return axios.request<unknown>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

    /**
   * @param username  
   */
  deleteUser(  username: string ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user/{username}';

    url = url.replace('{username}', encodeURIComponent("" + username));

    return axios.request<unknown>({
      url: url,
      method: 'DELETE',
      ...$config,
    });
  },

    /**
   * @param username  
   */
  getUserByName(  username: string ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<User> {
    let url = '/user/{username}';

    url = url.replace('{username}', encodeURIComponent("" + username));

    return axios.request<User>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },

    /**
   * @param username  
   * @param password  
   */
  loginUser(  username: string ,
      password: string ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<string> {
    let url = '/user/login';


    return axios.request<string>({
      url: url,
      method: 'GET',
      params: {
            'username': serializeQueryParam(username),
        'password': serializeQueryParam(password),
          },
      ...$config,
    });
  },

    /**
   */
  logoutUser(  $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user/logout';


    return axios.request<unknown>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },

    /**
   * @param username  
   * @param body  
   */
  updateUser(  username: string ,
      body: User ,
      $config?: AxiosRequestConfig
  ): AxiosPromise<unknown> {
    let url = '/user/{username}';

    url = url.replace('{username}', encodeURIComponent("" + username));

    return axios.request<unknown>({
      url: url,
      method: 'PUT',
      data: body,
      ...$config,
    });
  },

  };

  /**
   * @param username  
   */
export function useuserUserByName(  username: string ,
      $config?: SwrConfig
  ) {
  let url = '/user/{username}';
  const { axios: $axiosConf, key, ...config } = $config || {};

  url = url.replace('{username}', encodeURIComponent("" + username));

  let cacheUrl = url + '?';
const { data, error, mutate } = useSWR<User>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  /**
   * @param username  
   * @param password  
   */
export function useuserloginUser(  username: string ,
      password: string ,
      $config?: SwrConfig
  ) {
  let url = '/user/login';
  const { axios: $axiosConf, key, ...config } = $config || {};


  let cacheUrl = url + '?';
  if (!!username) {
    cacheUrl += `username=${username}&`;
  }

  if (!!password) {
    cacheUrl += `password=${password}&`;
  }

  const { data, error, mutate } = useSWR<string>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    params: {
        'username': serializeQueryParam(username),
      'password': serializeQueryParam(password),
      },
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  /**
   */
export function useuserlogoutUser(  $config?: SwrConfig
  ) {
  let url = '/user/logout';
  const { axios: $axiosConf, key, ...config } = $config || {};


  let cacheUrl = url + '?';
const { data, error, mutate } = useSWR<unknown>(
  key ?? cacheUrl,
  () => axios.request({
    url: url,
    method: 'GET',
    ...$axiosConf})
    .then((resp) => resp.data),
  config);

  return {
    data,
    isLoading: !error && !data,
    error: error,
    mutate,
  };
}

  
function serializeQueryParam(obj: any) {
  if (obj === null || obj === undefined) return '';
  if (obj instanceof Date) return obj.toJSON();
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .reduce((a: any, b) => a.push(b + '=' + obj[b]) && a, [])
    .join('&');
}
export interface ApiResponse {
  code?: number;
  type?: string;
  message?: string;
}

export interface Category {
  id?: number;
  name?: string;
}

export interface Pet {
  name: string;
  photoUrls: string[];
  id?: number;
  category?: Category;
  tags?: Tag[];

  status?: 'available'|'pending'|'sold';
}

export interface Tag {
  id?: number;
  name?: string;
}

export interface Order {
  id?: number;
  petId?: number;
  quantity?: number;
  shipDate?: Date;

  status?: 'placed'|'approved'|'delivered';
  complete?: boolean;
}

export interface User {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;

  userStatus?: number;
}
