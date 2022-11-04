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
