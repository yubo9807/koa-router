import { Context, Next } from 'koa';

type AnyObj     = { [prop: string | number | symbol]: any }

type Path       = string
type Middleware = (ctx: Context, next: Next) => void
type Method     = 'ALL' | 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'
type State      = AnyObj | null

interface Perform {
  path:       Path
  method:     Method
  middleware: Middleware
  state?:     State
  noBack?:    boolean
  redirect?:  Path
}

const performQueue: Perform[] = [];

export class Router {

  prefix: Path
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  /**
   * 将路由挂载到父级 route 下
   * @note 在 .method 之前调用
   * @param route 父级 route
   */
  async use(route: { prefix: string }) {
    this.prefix = route.prefix + this.prefix;
  }
  
  #noBack = false
  /**
   * 将不在获取所有路由中返回
   */
  noBack() {
    this.#noBack = true;
  }

  #state = null;
  /**
   * 添加额外注释信息
   * @note 在 .method 之前调用，否则将作用到下一个
   * @note 可以执行规范数据，用它来生成接口文档
   * @param state  任意对象
   */
  remark(state: State = null) {
    this.#state = state;
  }


  // 支持的 http method
  all     (path: Path, ...args: Middleware[]) { this.method('ALL',     path, ...args) }
  get     (path: Path, ...args: Middleware[]) { this.method('GET',     path, ...args) }
  post    (path: Path, ...args: Middleware[]) { this.method('POST',    path, ...args) }
  put     (path: Path, ...args: Middleware[]) { this.method('PUT',     path, ...args) }
  delete  (path: Path, ...args: Middleware[]) { this.method('DELETE',  path, ...args) }
  head    (path: Path, ...args: Middleware[]) { this.method('HEAD',    path, ...args) }
  connect (path: Path, ...args: Middleware[]) { this.method('CONNECT', path, ...args) }
  options (path: Path, ...args: Middleware[]) { this.method('OPTIONS', path, ...args) }
  trace   (path: Path, ...args: Middleware[]) { this.method('TRACE',   path, ...args) }
  patch   (path: Path, ...args: Middleware[]) { this.method('PATCH',   path, ...args) }

  /**
   * 添加对应方法的中间件
   * @param method 方法名
   * @param path   匹配路径
   * @param args   剩余参数：中间件
   */
  method(method: Method, path: Path, ...args: Middleware[]) {
    const index = performQueue.findIndex(val => val.method === method && val.path === this.prefix + path);
    if (index >= 0) throw new Error(`config url repeat：${method} ${this.prefix + path}`);

    let state = this.#state;
    let lock  = false;         // 加锁，保证 state 只添加一次
    args.forEach(middleware => {
      if (lock) state = null;  // 添加过后清空，节省内存消耗
      performQueue.push({
        method     ,
        middleware ,
        state      ,
        path:      this.prefix + path,
        redirect:  null,
        noBack:    this.#noBack
      })
      lock = true;
    });
    this.#state  = null;        // 恢复到默认值，保证不会作用到下次调用该方法
    this.#noBack = false;
  }

  /**
   * 接口重定向
   * @note 此方法回直接改变添加的 state 数据，移动到新接口上
   * @note 如不需移动 state 中的数据，请使用 koa ctx.redirect 方法
   * @note 注册过的中间件将不能重定向，重定向过的地址、方法也将不能再注册
   * @param method 
   * @param origin 原地址
   * @param target 新地址
   */
  redirect(method: Method, origin: string, target: string) {
    const rawAddress = this.prefix + origin;
    const redirect   = this.prefix + target;

    {
      const index = performQueue.findIndex(val => val.method === method && val.path === rawAddress);
      if (index < 0) throw new Error(`${method} ${rawAddress} not registered yet, can't use redirect`);
    }
    {
      const index = performQueue.findIndex(val => val.method === method && val.path === redirect);
      if (index >= 0) throw new Error(`config url repeat：${method} ${redirect}`);
    }

    let backupsPath = null;  // 备份原 path 路径

    const list = performQueue.filter(val => {
      if (val.method === method && val.path === rawAddress) {
        backupsPath = val.path;
        val.path    = redirect;
        return true;
      }
    });

    if (list.length <= 0) return;

    // 将原注册地址、方法添加到执行队列中，并发生重定向
    performQueue.push({
      method      ,
      redirect    ,
      path:       backupsPath,
      middleware: ctx => ctx.redirect(redirect),
      state:      null,
    });
  }

}


/**
 * 获取所有路由
 * @return 路由列表
 */
export function getRouteList() {
  const list = [];
  // 对注册过的 method path 进行收集
  performQueue.forEach(val => {
    if (val.noBack || val.method === 'ALL') return;
    const index = list.findIndex(item => item.method === val.method && item.path === val.path);
    if (index >= 0) return;

    // 只返回有用的数据
    const { method, path, state, redirect } = val;
    list.push({ method, path, state, redirect });
  })
  return list;
}


/**
 * 执行对应的的中间件
 * @note 保证在程序的最后执行
 * @return koa 中间件
 */
export async function routes(ctx: Context, next: Next) {
  const middlewareList = [];
  performQueue.forEach(val => {
    if (val.path === ctx.URL.pathname && [ctx.method, 'ALL'].includes(val.method)) {
      middlewareList.push(val.middleware);
    }
  });
  await compose(middlewareList, ctx, next);
}

/**
 * 中间件执行队列处理
 * @param middlewareList 中间件list
 * @param ctx
 * @param next 
 */
function compose(middlewareList: Middleware[], ctx: Context, next: Next) {
  async function dispatch(i: number) {
    let fn = middlewareList[i];
    if (i === middlewareList.length) fn = next;
    return Promise.resolve(fn(ctx, dispatch.bind(null, ++i)));
  }
  return dispatch(0);
}
