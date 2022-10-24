import { getRouteList, Router, routes } from './index';

const route_root = new Router('');
route_root.noBack();  // 下一条配置路由将不会
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

// 最后添加到 koa 中间件中
// app.use(routes());
