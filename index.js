'use strict';
const Path = require('path')
const Mock = require('mockjs')
const rd = require('rd');

const seagger = require('./swagger.js')

let isMock = process.argv.indexOf("mock")>1? true : false;
const isSwagger = process.argv.indexOf("swagger")>1? true : false; 

function mockControl(req,res,next){
  let path = req.path;
  if(req.path.lastIndexOf(".")>0){
    path = req.path.substring(0,req.path.lastIndexOf("."))
  }
  if(!path){ return next() }
  path = Path.join(process.cwd(),'mock',path)

  // 先获取模块请求对应地址
  let modulePath;
  try {
    modulePath = require.resolve(path)
  } catch (error) {
    // next()
    let files = getMockModuleList()
    files.every(function(file){
      let pattern = file.substring(0,file.lastIndexOf("."))
      pattern = '^' + pattern.replace(/\*/g,'\\w*') + '$'
      if(new RegExp(pattern).test(path)){
        modulePath = file
        return false
      }else{
        return true
      }
    })
  }
  if(!modulePath){ return next() }

  // 加载对应模块
  delete require.cache[modulePath]
  let mockModule = null
  try {
    mockModule = require(modulePath)
  } catch (error) {
    return next()
  }

  if(!mockModule){ return next() }

  if(typeof mockModule === 'function' ){
    mockModule(req,res,next)
  }else if(mockModule instanceof Array){
    let method = req.method;
    mockModule.forEach((item=>{
      if(item.method && item.method.toUpperCase() === method){
        res.status(item.status || 200).send(mockjs(item.body));
      }
    }))
  }else if(typeof mockModule === "object"){
    res.json(mockjs(mockModule))
  }else{
    next()
  }
}

// let mockModuleList = null
// 获取模块列表 用于匹配请求
function getMockModuleList(){
  // if(mockModuleList){return}
  let files = rd.readFileFilterSync(Path.join(process.cwd(),'mock'),/\.(js|json)$/);
  return files
}


// 调用mockjs mock数据
function mockjs(module){
  return Mock.mock(module)
}

// 注册路由
function registerRouter(app,path){
  if(isMock){
    app.use(path,mockControl)
  }
  if(isSwagger){
    app.use(path,seagger)
    // seagger(app)
  }
  
  
}

module.exports = function (app, proxy) {
  // if(!isMock){ return }

  if (proxy instanceof Array) {
    // 数组写法配置的代理
    proxy.forEach(function (proxyConfig) {
      let urlPath = proxyConfig.context || proxyConfig.path;
      registerRouter(app,urlPath)
      // app.use(urlPath,mockControl)
    }.bind(this));
  } else {
    // 对象写法配置的代理
    Object.keys(proxy).forEach(function (key) {
      registerRouter(app,key)
      // app.use(key,mockControl)
    }.bind(this))
  }
}