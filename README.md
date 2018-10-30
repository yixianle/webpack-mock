# mock

## 简介
一个基于本地文件系统的mock方案 </br>
适用于webpack-dev-server或其他基于express的server

### 原理
通过webpack-dev-server 拦截请求，跟本地的mock目录进行匹配，能匹配上的请求返回本地的mock数据，否则走proxy代理转发至服务端接口

### 特性
1、支持mockjs语法 </br>
2、支持通过Swagger文件自动生成mock数据 </br>
3、支持暴露出request和response，可灵活的在mock中写逻辑控制 </br>
4、mock代码于业务代码解耦，线上于开发环境代码保持一致 </br>
5、有真实的请求发出，可在DevTools中调试 </br>
6、支持REST风格的接口


## 使用
1、 安装
```
nbm i webpack-server-mock --save-dev
```
2、 在webpack配置中，调用mock注册相关中间件
```

const Mock = require('webpack-server-mock');
module.exports={
    entry: {
        app: config.resolve('src', 'index.js')
    },
    ...
    devServer: {
        proxy: {
            '/api': {
                changeOrigin: true,
                target: 'http://192.168.1.1:8080', //服务端地址
            },
            '/server-path': {
                changeOrigin: true,
                target: 'http://192.168.1.2:8080',
            }
        },
        port: 9000,
        ...
        before(app){
            // 此处调用mock 注册相关中间件
            Mock(app,this.proxy);
        }
    }
}
```
关键的配置就这么一段代码
```
Mock(app,this.proxy);
```
3、 在项目根目录中创建mock目录，mock文件要放在该目录下


4、 在命令行中启动项目时加上mock或swagger
```
// 开启mock
npm run dev mock
// 开启mock 和 swagger
npm run dev mock swagger
```
## mock写法
1、json文件形式   test.json
```  
{
    "title": "Syntax Demo121216666",
    "array1|1": ["AMD", "CMD", "KMD", "UMD"],
    "array2|1-10": ["Mock.js"],
    "array3|3": ["Mock.js"]
}
```
2、js文件 简单模式  test.js
```  
// 可以写点简单的逻辑
let data = {
    'title': 'Syntax Demo1212',
    'array1|1': ['AMD', 'CMD', 'KMD', 'UMD'],
    'array2|1-10': ['Mock.js'],
    'array3|3': ['Mock.js'],
    'function': function() {
        return this.title
    },
};

// data 为空的时候，此处mock不起作用，会走后面的swagger或代理转发
// data = null

module.exports = data
```
3、相同路径，不同的method
```  
const getData = {
    'title': 'Syntax Demo1212',
    'array1|1': ['AMD', 'CMD', 'KMD', 'UMD'],
    'array2|1-10': ['Mock.js'],
    'array3|3': ['Mock.js'],
    'function': function() {
        return this.title
    },
};

const postData = {
    'code': 1,
    'msg': '',
};


module.exports = [{
    method: "get",
    status: 200,
    body: getData
},{
    method: "post",
    status: 200,
    body: postData
}];
```
4、暴露request和response，可写业务逻辑
```  
module.exports = function(req,res,next){
    let type = req.query.type
    if(type==1){
        res.json({
            msg:"我的type是1"
        })
    }else if(type==2){
        res.json({
            msg:"我的type是2"
        })
    }else{
        next()
    }
}
```
5、 请求与本地路径匹配规则
```
curl -X GET /api/v1/getcurrentUserInfo
=>  projectPath/mock/v1/getcurrentUserInfo.js

curl -X GET /server-path/api/webserver/model/{modelId}
=>  projectPath/mock/api/webserver/model/*.js

curl -X GET /server-path/api/{productId}/detail
=>  projectPath/mock/api/*/detail.js

```

