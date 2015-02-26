/* jslint node: true */
"use strict";

var fs = require('fs');
var crier = require('crier').addGroup('templated');

var cache = {};
var engines = {};

module.exports = render;
render.load = load;
render.addEngine = addEngine;
render.removeEngine = removeEngine;
render.getEngines = getEngines;

function render(path,locals,reload,callback){
  load(path,reload,function(error,template){
    if(!error){
      callback(undefined,template(locals));
    } else {
      callback(error);
    }
  });
}

function load(path,reload,callback){
  var ext = path.replace(/^.*\./,'');
  var engine = engines[ext] || false;
  if(cache[path] && !reload){
    if(callback){
      callback(undefined,cache[path]);
    }
  } else {
    if(engine){
      fs.readFile(path,{encoding:'utf8'},function(error,source){
        try {
          if(error){
            throw error;
          }
          cache[path]=engine(source,path);
          crier.info('loaded',{path:path});
          if(callback){
            callback(undefined,cache[path]);
          }
        } catch (error){
          crier.error('compileError',{path:path,error:error});
          if(callback){
            callback(error);
          }
        }
      });
    } else {
      var error = new Error("Unknow engine");
      crier.alert('unknowEngine',{path:path,error:error});
      if(callback){
        callback(error);
      }
    }
  }
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