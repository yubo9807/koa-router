# koa-router 重写

## purpose

- 为解决企业管理端接口配置的问题，可以将所有接口返回给前端。

## introduce

- 区别在于可返回所配置过的所有路由；
- 动态路由并未实现，PS: `/api/:id`；
- 作为中间层服务器代理的问题请自行解决；
- 只是提供一个思路，关于 JAVA 或 Go 服务端也可这样做，PS: https://github.com/yubo9807/go_koa 。

## use

```ts
import { getRouteList, Router, routes } from '../src';

const route_root = new Router('');
route_root.noBack();  // 下一条配置路由将不会在获取路由中返回
route_root.method('GET', '/index.html', () => {});

const route_main = new Router('/api');

const route_v1 = new Router('/v1');
route_v1.use(route_main);
route_v1.method('POST', '/user/signIn',  async (ctx, next) => {});
route_v1.method('GET',  '/user/signOut', async (ctx, next) => {});


const route_v2 = new Router('/v2');
route_v2.use(route_main);
route_v2.method('POST', '/file/upload/image',  async (ctx, next) => {});
// 重定向，只作用于当前 router 下
route_v2.redirect('POST', '/file/upload/image', '/file/upload/image2');

// 获取所有配置过的路由
console.log(getRouteList());
/*
[
  { method: 'POST', path: '/api/v1/user/signIn', redirect: null },
  { method: 'GET', path: '/api/v1/user/signOut', redirect: null },
  { method: 'GET', path: '/api/v2/file/upload/image', redirect: null },
  { method: 'POST', path: '/api/v2/file/upload/image', redirect: '/api/v2/file/upload/image2' },
  { method: 'POST', path: '/api/v2/file/upload/image2', redirect: null }
]
*/

// 最后添加到 koa 中间件中
app.use(routes());
```

> 关于重定向后的接口是否要返回，请自行过滤
