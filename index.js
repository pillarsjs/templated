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
    callback(undefined,cache[path]);
  } else {
    if(engine){
      fs.readFile(path,{encoding:'utf8'},function(error,source){
        try {
          if(error){
            throw error;
          }
          cache[path]=engine(source,path);
          crier.info('load',{path:path,error:error});
          callback(cache[path]);
        } catch (error){
          crier.error('error',{path:path,error:error});
          callback(error);
        }
      });
    } else {
      var error = new Error("Unknow engine");
      crier.alert('error',{path:path,error:error});
      callback(error);
    }
  }
}

function addEngine(ext,compiler){
  engines[ext]=compiler;
}

function removeEngine(ext){
  if(engines[ext]){delete engines[ext];}
}