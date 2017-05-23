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
        if(template.async){
          template(locals,callback);
        } else {
          callback(undefined,template(locals));
        }
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
    } else if(!template.engine){
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

function addEngine(ext,compiler,async){
  if(async){compiler.async=true;}
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
      if(Date.now()<=item.timeStamp+5000 || !fresh){
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
              item.data = data.toString();
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

// Add default template engines support to Templated
render.loadDefaultEngines = function(){
  var templated = render;

  var marked = require('marked');
  marked.setOptions({
    highlight: function (code,lang) {
      return hljsFix(code,lang);
    }
  });
  var hljs = require('highlight.js');
  function hljsFix(str,lang){
    var result;
    if(lang){
      result = hljs.highlight(lang,str,true).value;
    } else {
      result = hljs.highlightAuto(str).value;
    }
    result = result.replace(/^((<[^>]+>|\s{4}|\t)+)/gm, function(match, r) {
      return r.replace(/\s{4}|\t/g, '  ');
    });
    result = result.replace(/\n/g, '<br>');
    return '<pre class="highlight"><code>'+result+'</code></pre>';
  }
  templated.addEngine('md',function compiler(source,path){
    var html = marked(source);
    return function(locals){return html;};
  });

  var pug = require('pug');
  pug.filters.highlight = function(str,opts){
    return hljsFix(str,opts.lang);
  };
  pug.filters.marked = function(str,opts){
    return marked(str,opts);
  };
  pug.filters.codesyntax = function(str,opts){
    str = str.replace(/^((<[^>]+>|\s{4}|\t)+)/gm, function(match, r) {
      return r.replace(/\s{4}|\t/g, '  ');
    });
    return '<pre class="codesyntax"><code>'+str+'</code></pre>';
  };

  templated.addEngine('jade',function compiler(source,path){
    return pug.compile(source,{filename:path,pretty:false,debug:false,compileDebug:true});
  });

  templated.addEngine('pug',function compiler(source,path){
    return pug.compile(source,{filename:path,pretty:false,debug:false,compileDebug:true});
  });

  templated.addEngine('jsml',function compiler(source,path){
    return pug.compile(source,{filename:path,pretty:false,debug:false,compileDebug:true});
  });

  var handlebars = require("handlebars");
  templated.addEngine('hbs',function compiler(source,path){
    return handlebars.compile(source);
  });

  var hogan = require("hogan.js");
  templated.addEngine('hgn',function compiler(source,path){
    return hogan.compile(source);
  });

  var nunjucks = require("nunjucks");
  templated.addEngine('njk',function compiler(source,path){
    return nunjucks.compile(source);
  });

  var less = require('less');
  templated.addEngine('less',function(source,path){
    return function(locals,callback){
      less.render(source,{
        //paths: ['.', './lib'],  // Specify search paths for @import directives
        filename: path,
        compress: true
      },function (e, output) {
        callback(undefined,output.css);
      });
    };
  },true);

  /*
  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  // From: http://ejohn.org/blog/javascript-micro-templating/
  var jmt = (function(){
    var cache = {};
    return function tmpl(str, data){
      // Figure out if we're getting a template, or if we need to
      // load the template - and be sure to cache the result.
      var fn = new Function("obj",
          "var p=[],print=function(){p.push.apply(p,arguments);};" +
         
          // Introduce the data as local variables using with(){}
          "with(obj){p.push('" +
         
          // Convert the template into pure JavaScript
          str
            .replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join("p.push('")
            .split("\r").join("\\'")
        + "');}return p.join('');");
     
      // Provide some basic currying to the user
      return data ? fn( data ) : fn;
    };
  })();
  templated.addEngine('jmt',function compiler(source,path){
    return jmt.compile(source);
  });
  */
};