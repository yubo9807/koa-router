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
import { getRouteList, Router, routes } from './index';

const app = new Koa();

// 跟目录
const route_api = new Router('/api');

// 版本一接口
const route_v1 = new Router('/v1');
route_v1.use(route_api);

route_v1.post('/file/upload', () => {})
  .redirect('/file/upload2')
  .state({ name: '上传文件' })
	.exec();

// 版本二接口
const route_v2 = new Router('/v2');
route_v2.use(route_api);
route_v2.get('/menu/list', search, getData, paging).exec();


// 获取所有配置过的路由
console.log(getRouteList());

// 最后添加到 koa 中间件中
app.use(routes);
```

> 关于重定向后的接口是否要返回，请自行过滤
