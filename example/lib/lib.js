var fs = require('fs'),
    spawn = require('child_process').exec,
    net = require('net'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    ClosureCompilerService,
    EntryPoint;
    
EntryPoint = function(entryPoint, callback) {
  this.entryPoint = entryPoint;
  this.callback = callback;
  this.dependencies = [];
}
EntryPoint.prototype = {
  setDependencies: function(dependencies, merge) {
    
    if (merge && this.dependencies.length) {
      dependencies = dependencies.filter(function(dep) {
        return this.dependencies.indexOf(dep) === -1;
      }, this);
      [].push.apply(this.dependencies, dependencies);
    }else {
      this.dependencies = dependencies;
    }
    
    return this;
    
  }
}

ClosureCompilerService = function(opts) {
  var that = this;
  for (var opt in opts) {
    if (opts.hasOwnProperty(opt)) this.config[opt] = opts[opt];
  }
  
  if (this.config.closureCompilerServiceJar) {
    var child =
          spawn('java -jar ' + this.config.closureCompilerServiceJar + ' -p ' + this.config.port, function(err, out) {
            //service probably died. Restart? Or kill node process too?
          });
    child.stdout.on('data', function serviceReadyChecker(data) {
      if (data.indexOf('ClosureCompilerService has STARTED') > -1) {
        that.serviceIsReady = true;
        that.events.emit('listening', that);
        child.stdout.removeListener('data', serviceReadyChecker);
      }
    });
    child.stdout.pipe(process.stdout);
    child.stdin.pipe(process.stdout);
    this.config.closureCompilerServiceChild = child;
    
  }else {
    //since we're not starting it ourselves, no need to wait. H/e, would it be good to run an echo test first?
    this.serviceIsReady = true;
  }
  
  (function waitForIsReady() {
    if (that.serviceIsReady) {
      that.synchronizeRemoteFiles(that.config.closureLibraryMapper, function() {
        that.isSynchronized = true;
      });
    }else setTimeout(waitForIsReady, 50);
  }());
}

ClosureCompilerService.prototype = {
  events: new EventEmitter(),
  config: {
    port: 7990,
    host: 'localhost',
    closureCompilerServiceJar: null//if defined will spin up an instance
  },
  watch: function(entryPoint, callback) {
    var entryPointInstance = new EntryPoint(entryPoint, callback),
        that = this;
    
    
    (function waitForIsSynchronized() {
      if (that.isSynchronized) {
        that.manageEntryPoint(entryPointInstance, function() {
          that.events.emit('ready', that);
        });
      }else setTimeout(waitForIsSynchronized, 50);
    }());
    
    return this;
  },
  manageEntryPoint: function(entryPointInstance, callback) {
    this.getDependencies(entryPointInstance, function(deps) {
      //set dependencies or merge new dependencies together
      entryPointInstance.setDependencies(deps, !!entryPointInstance.dependencies.length);
      
      this.addWatchers(entryPointInstance);
      this.addFiles(entryPointInstance, function() {
        callback && callback.call(this, entryPointInstance);
      });
      
    });
  },
  getDependencies: function(entryPointInstance, callback) {
    var cmd = [
          'python',
          this.config.closurebuilder,
          '--namespace="' + entryPointInstance.entryPoint + '"'
        ],
        closureBase = this.config.closureBase,
        currentDir = process.cwd(),
        sources = this.config.source || [];
    
    [closureBase].concat(sources).forEach(function(src) {
      cmd.push('--root=' + src + '');
    });
    
    spawn(cmd.join(' '), function(err, stdout) {
      var deps = stdout.trim().split('\n');
      
      //TODO: wow, need to find a better fix than this!
      deps = deps.map(function(dep) {
        if (dep.indexOf(closureBase) > -1) return path.relative(closureBase, dep);
        else return path.relative(currentDir, dep);
      });
      
      callback && callback.call(this, deps);
    }.bind(this));    
  },
  fileChange: function(entryPointInstance, file, curr, prev) {
    if (prev.mtime < curr.mtime) {      
      //file's changed, so we'll need to re-add it
      this._added[file] = false;
      
      this.manageEntryPoint(entryPointInstance, function() {
        //TODO: unwatch files that are no longer dependencies
        this.compile(entryPointInstance);
      }.bind(this));
    }
  },
  _watched:{},
  addWatchers: function(entryPointInstance) {
    entryPointInstance.dependencies.forEach(function(file) {
      if (!this._watched[file]) {
        fs.watchFile(file, { persistent: true, interval: 1 }, this.fileChange.bind(this, entryPointInstance, file));
      }
      this._watched[file] = true;
    }, this);
  },
  _added:{},
  addFiles: function(entryPointInstance, callback) {
    //remove files that have already been added
    var files = entryPointInstance.dependencies.filter(function(file) {
      return !this._added[file];
    }, this);
    
    //move remaining array in to expected format
    files = files.map(function(file) {
      this._added[file] = true;
      return {
        //or we can pass in path if we want ClosureCompilerService to read the contents. Only advantage is ClosureCompilerService will manage the names of everything.
        //path:fs.realpathSync(file),
        //reload: false,
        'name': file,
        'contents': fs.readFileSync(file).toString()
      }
    }, this);
    
    this.send({
      cmd: 'addFiles',
      files: files
    }, function() {
      callback && callback.call(this, entryPointInstance);
    }.bind(this));
    
  },
  //adds files that are already in ClosureCompilerService's cache to our local cache so we didn't waste time re-syncing.
  //This is mostly for closure-library files.
  //The mapper is useful for matching the path of your closure-library files with the path in ClosureCompilerService.
  synchronizeRemoteFiles: function(mapper, callback) {
    var hasMapper = typeof(mapper) === "function";
    this.send({
      cmd: 'getFiles'
    }, function(response) {
      var files = JSON.parse(response.result);
      files.forEach(function(file) {
        this._added[ hasMapper ? mapper(file) : file ] = true;
      }, this);
      callback && callback.call(this);
    }.bind(this));
  },
  compile: function(entryPointInstance) {
    //TODO: optimize this args stuff
    var args = this.config.args;
    args['js'] = entryPointInstance.dependencies;
    args['closure_entry_point'] = entryPointInstance.entryPoint;
    
    this.send({
      cmd: 'compile',
      args: args
    }, function(data) {
      entryPointInstance.callback.call(this, data.result);
    }.bind(this));
  },
  send: function(cmd, callback) {
    var client = net.createConnection(this.config.port, this.config.host, function() {
      client.setNoDelay(true);
      client.setEncoding('utf8');
      client.on('data', (function() {
        var s = '';
        return function(data) {
          var json;
          s += data.toString();
          try{
            json = JSON.parse(s);
            s = '';
            client.emit('response', json);
          }catch(e) {}
        };
      }()));
      if (typeof(cmd) !== 'string') cmd = JSON.stringify(cmd);
      client.write(cmd, 'utf8');
      client.end('\n', 'utf8');
      client.once('response', callback);
    });  
  }
}

exports.ClosureCompilerService = function(opts) {
  return new ClosureCompilerService(opts);
}