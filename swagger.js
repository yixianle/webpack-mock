const Path = require('path')
const _ = require('lodash')
const jsf = require('json-schema-faker')

let seagger;
try {
    const seaggerPath = Path.join(process.cwd(),'mock','swagger-api.json');
    seagger = require(seaggerPath);
} catch (error) {
    seagger = {
        paths: {},
        definitions: {}
    }
}
const { paths, definitions} = seagger

jsf.option({
  failOnInvalidTypes: false,
  defaultInvalidTypeProduct: ''
})

// Custom formats
jsf.format('date', () => '@date')
jsf.format('byte', () => '@string')
jsf.format('binary', () => '@string')
jsf.format('password', () => '@string')
jsf.format('float', () => '@float')
jsf.format('double', () => '@float')
jsf.format('int32', () => '@integer')
jsf.format('int64', () => '@integer')



function requireAllProperties (definitions) {
    const newDef = {}

    _.forEach(definitions, (value, key) => {
        newDef[key] = Object.assign({}, value)
    })

    _.toPairs(newDef)
        .filter(definitionPair => !!definitionPair[1].properties || !!definitionPair[1].allOf)
        .forEach((definitionProps) => {
        const key = definitionProps[0]
        const value = definitionProps[1]
        if (value.properties) {
            newDef[key].required = Object.keys(value.properties)
        } else if (value.allOf) {
            // 针对 allOf 属性添加 required 属性
            _.forEach(value.allOf, (item, i) => {
            if (!item.properties) return
            newDef[key].allOf[i].required = Object.keys(item.properties)
            })
        }
        })

    return newDef
}

let _definitions = null;
function getDefinitions(projectId, docs){
    if(_definitions) return _definitions;
    if (!definitions) return;
    Object.keys(definitions).forEach((key) => {
        const definition = definitions[key]
        const properties = definition.properties || {}
        Object.keys(properties).forEach((key) => {
        const propertie = properties[key]
        if (propertie.items && definitions[propertie.items.type]) {
            const type = propertie.items.type || propertie.items.$ref
            propertie.items.$ref = `#/definitions/${type}`
            delete propertie.items.type
        }
        })
    })
    _definitions = requireAllProperties(definitions)
    return _definitions
}

module.exports = function (req,res,next) {
    let swgPath;
    Object.keys(paths).every(function(item){
        let pattern = '^' + item.replace(/\{\w*\}/g,'\\w*') + '$'
        if(new RegExp(pattern).test(req.originalUrl)){
            swgPath = item
            return false
        }else{
            return true
        }
    })
    if(!swgPath){ return next() }
    
    if(paths[swgPath][req.method.toLowerCase()]){
        let response = paths[swgPath][req.method.toLowerCase()].responses
        response = response[200] && response[200].schema
        let sample;
        try {
            sample = jsf({
                definitions: getDefinitions(),
                response
            }).response || {}
        } catch (e) {
            sample = {
                error: e.message
            }
        }
        // 各种code 统一返回成功状态 0
        ['code','status','iamStatus','retCode','resultCode'].forEach(item=>{
            if(sample.hasOwnProperty(item)){
                sample[item] = 0
            }
        })

        res.send(sample)
    }else{
        return next()
    }
}
