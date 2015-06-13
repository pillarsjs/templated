/* jslint node: true */
"use strict";

global.modulesCache = global.modulesCache || {};
if(global.modulesCache['templated']){
  module.exports = global.modulesCache['templated'];
  return;
}

var fs = require('fs');
var crier = require('crier').addGroup('templated');
var i18n = require('textualization');

var engines = {};

module.exports = global.modulesCache['templated'] = render;
render.load = load;
render.addEngine = addEngine;
render.removeEngine = removeEngine;
render.getEngines = getEngines;

i18n.load('templated',__dirname+'/languages/');

function render(path,locals,reload,callback){
  if(typeof path === 'function'){
    callback(undefined,path(locals));
  } else {
    load(path,reload,function(error,template){
      if(!error){
        callback(undefined,template(locals));
      } else {
        callback(error);
      }
    });
  }
}

function load(path,reload,callback){
  templateCache.get(path,reload,function(error,template){
    if(error){
      if(callback){
        callback(error);
      }
    } if(!template.engine){
      var error = new Error("Unknow engine");
      crier.alert('unknowEngine',{path:path,error:error});
      if(callback){
        callback(error);
      }
    } else {
      try {
        if(!template.compiled){
          template.compiled = template.engine(template.data,path);
          crier.info('loaded',{path:path});
        }
        if(callback){
          callback(undefined,template.compiled);
        }
      } catch(error){
        crier.error('compileError',{path:path,error:error});
        if(callback){
          callback(error);
        }
      }
    }
  });
}

function addEngine(ext,compiler){
  engines[ext]=compiler;
}

function removeEngine(ext){
  if(engines[ext]){delete engines[ext];}
}

function getEngines(){
  return Object.keys(engines);
}

var templateCache = {
  items:{},
  get : function(id,fresh,callback){
    var item = templateCache.items[id];
    if(typeof item !== 'undefined'){
      if(item.timeStamp<Date.now()-30*1000 || !fresh){
        callback(null,item);
      } else {
        templateCache.file(id,callback,item);
      }
    } else {
      templateCache.file(id,callback);
    }
  },
  file: function(id,callback,update){
    var item = update?update:{};
    fs.stat(id, function(error,stats){
      if(error){
        callback(error);
      } else {
        item.timeStamp = Date.now();
        if(!update || stats.mtime>item.stats.mtime){
          fs.readFile(id, function(error,data){
            if(error){
              callback(error);
            } else {
              templateCache.items[id] = item;
              item.stats = stats;
              item.ext = id.replace(/^.*\./,'');
              item.engine = engines[item.ext] || false;
              delete item.data;
              delete item.compiled;
              item.data = data;
              callback(null,item);
            }
          });
        } else {
          callback(null,item);
        }
      }
    });
  }
};