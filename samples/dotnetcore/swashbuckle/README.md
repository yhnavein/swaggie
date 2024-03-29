# Server config sample

## ASP.NET Core Swashbuckle configuration

You can open `Swaggie.Swashbuckle/Swaggie.Swashbuckle.sln` in Rider or VS to see the sample ASP.NET Core project with Swashbuckle configured. It is working out of the box and it requires `dotnet 6.0`. It should be compatible with other dotnet versions as well.

## Swaggie result

This is how the generated API Client in TypeScript looks like:

```ts
/* tslint:disable */
/* eslint-disable */
//----------------------
// <auto-generated>
//   Generated using Swaggie (https://github.com/yhnavein/swaggie)
//   Please avoid doing any manual changes in this file
// </auto-generated>
//----------------------
// ReSharper disable InconsistentNaming

import Axios, { AxiosPromise, AxiosRequestConfig } from 'axios';

export const axios = Axios.create({
  baseURL: '',
});

export const userClient = {
  /**
   * @param body (optional)
   */
  createUser(
    body: UserViewModel | null | undefined,
    $config?: AxiosRequestConfig
  ): AxiosPromise<UserViewModel> {
    let url = '/user';

    return axios.request<UserViewModel>({
      url: url,
      method: 'POST',
      data: body,
      ...$config,
    });
  },

  /**
   * @param id
   */
  deleteUser(id: number, $config?: AxiosRequestConfig): AxiosPromise<any> {
    let url = '/user/{id}';

    url = url.replace('{id}', encodeURIComponent('' + id));

    return axios.request<any>({
      url: url,
      method: 'DELETE',
      ...$config,
    });
  },

  /**
   */
  getUsers($config?: AxiosRequestConfig): AxiosPromise<UserViewModel[]> {
    let url = '/user';

    return axios.request<UserViewModel[]>({
      url: url,
      method: 'GET',
      ...$config,
    });
  },
};

function serializeQueryParam(obj: any) {
  if (obj === null || obj === undefined) return '';
  if (obj instanceof Date) return obj.toJSON();
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .reduce((a: any, b) => a.push(b + '=' + obj[b]) && a, [])
    .join('&');
}

export type UserRole = 'Admin' | 'User' | 'Guest';

export interface UserViewModel {
  name?: string;
  id?: number;
  email?: string;
  role?: UserRole;
}
```

## Auto generating Swagger on the build

With Swashbuckle it is possible to generate Swagger JSON files automatically on the build.
Whenever API is built Swagger definitions are regenerated and saved on the disk.
Please take a look on the `PostBuild` task in `Swaggie.Swashbuckle/Swaggie.Swashbuckle.csproj` to see how it works.

The benefits from this approach are that it's much faster and you don't have to have an API running to be able to use Swaggie.
