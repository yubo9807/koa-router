import { Context, Next } from 'koa';

type AnyObj     = { [prop: string | number | symbol]: any }

type Path       = string
type Middleware = (ctx: Context, next: Next) => void
type Method     = 'ALL' | 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'
type State      = AnyObj | null

interface Perform {
  path:        Path
  method:      Method
  middleware:  Middleware
  state?:      State
  originPath?: Path
}

const performQueue: Perform[] = [];

export class Router {

  prefix:              Path
  #currentMethod:      Method       = null;
  #currentPath:        Path         = null;
  #currentMiddlewares: Middleware[] = null;
  #currentRedirect:    Path         = null;
  #currentState:       State        = null;

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

  /**
   * 添加额外注释信息
   * @note 在 .method 之前调用，否则将作用到下一个
   * @note 可以执行规范数据，用它来生成接口文档
   * @param state  任意对象
   */
  state(state: State) {
    this.#currentState = state;
    return this;
  }


  // 支持的 http method
  all     (path: Path, ...args: Middleware[]) { this.method('ALL',     path, ...args); return this; }
  get     (path: Path, ...args: Middleware[]) { this.method('GET',     path, ...args); return this; }
  post    (path: Path, ...args: Middleware[]) { this.method('POST',    path, ...args); return this; }
  put     (path: Path, ...args: Middleware[]) { this.method('PUT',     path, ...args); return this; }
  delete  (path: Path, ...args: Middleware[]) { this.method('DELETE',  path, ...args); return this; }
  head    (path: Path, ...args: Middleware[]) { this.method('HEAD',    path, ...args); return this; }
  connect (path: Path, ...args: Middleware[]) { this.method('CONNECT', path, ...args); return this; }
  options (path: Path, ...args: Middleware[]) { this.method('OPTIONS', path, ...args); return this; }
  trace   (path: Path, ...args: Middleware[]) { this.method('TRACE',   path, ...args); return this; }
  patch   (path: Path, ...args: Middleware[]) { this.method('PATCH',   path, ...args); return this; }

  /**
   * 添加对应方法的中间件
   * @param method 方法名
   * @param path   匹配路径
   * @param args   剩余参数：中间件
   */
  method(method: Method, path: Path, ...args: Middleware[]) {
    const index = performQueue.findIndex(val => val.method === method && val.path === this.prefix + path);
    if (index >= 0) throw new Error(`config url repeat：${method} ${this.prefix + path}`);

    this.#currentMethod      = method;
    this.#currentPath        = path;
    this.#currentMiddlewares = args;

    return this;
  }


  /**
   * 接口重定向
   * @param path 新地址
   */
  redirect(path: string) {
    this.#currentRedirect = path;
    performQueue.push({
      method:     this.#currentMethod,
      path:       this.#currentPath,
      middleware: (ctx, next) => { ctx.redirect(this.prefix + path) },
    });
    return this;
  }

  /**
   * 重置临时属性
   */
  #restore() {
    this.#currentMethod      = null
    this.#currentPath        = null
    this.#currentMiddlewares = null
    this.#currentRedirect    = null
    this.#currentState       = null
  }

  /**
   * 将配置信息添加到执行队列中
   */
  exec() {
    this.#currentMiddlewares.forEach(val => {
      performQueue.push({
        method:     this.#currentMethod,
        middleware: val,
        state:      this.#currentState,
        path:       this.prefix + (this.#currentRedirect || this.#currentPath),
        originPath: this.#currentRedirect && this.prefix + this.#currentPath,
      });
    })
    this.#restore();
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
    if (val.method === 'ALL') return;
    const index = list.findIndex(item => item.method === val.method && item.path === val.path);
    if (index >= 0) return;

    // 只返回有用的数据
    const { middleware, state, ...args } = val;
    list.push({ ...state, ...args });
  });
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
