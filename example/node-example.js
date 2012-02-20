var fs = require('fs'),
    spawn = require('child_process').exec,
    querystring = require('querystring'),
    http = require('http'),
    ClosureCompilerService = require('./lib/lib.js').ClosureCompilerService,
    closureBase = fs.realpathSync('../lib/closure-library/'),
    closureBuilder = fs.realpathSync(closureBase + '/closure/bin/build/closurebuilder.py'),
    serviceInstance;


serviceInstance = ClosureCompilerService({
  'closureCompilerServiceJar': false, //'../bin/ClosureCompilerService.jar',
  'closurebuilder': closureBuilder,
  'closureBase': closureBase,
  'source': ['./src/'],
  'args': {
    'compilation_level': 'ADVANCED_OPTIMIZATIONS',//SIMPLE_OPTIMIZATIONS
    'process_closure_primitives': true,
    'manage_closure_dependencies': true,
    'warning_level': 'QUIET'
  }
  /*,'closureLibraryMapper': function(file) {
    return file;
  }*/
});

//we'll watch the namespace (instead of the file). When it's been modified, we'll kick off the timer for ClosureCompilerService
serviceInstance.watch('example.pattern', function(source) {
  console.timeEnd('ClosureCompilerService');
  fs.writeFileSync('compiled/pattern.js', source);
  console.time('closurebuilder.py');
  timeClosureBuilder();
});

serviceInstance.events.on('ready', function() {
  var file = 'src/pattern.js',
      time = Date.now() + 10;
  
  console.log('Modifying `example.pattern` to now', time);
  fs.utimesSync(file, time, time);
  console.time('ClosureCompilerService');
});

//runs essentially the same thing as ClosureCompilerService except via the closurebuilder.py script (oh ya, and much MUCH slower :).
function timeClosureBuilder() {
  var cmdlineCmd = [
        'python',
        closureBuilder,
        '--namespace="example.pattern"',
        '--output_mode=compiled',
        '--compiler_jar=../lib/compiler.jar',
        '--compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS"'
      ],
      sources = [closureBase, './src/'];
  
  sources.forEach(function(src) {
    cmdlineCmd.push('--root="' + src + '"');
  });
  spawn(cmdlineCmd.join(' '), function(err, stdout) {
    console.timeEnd('closurebuilder.py');
    console.time('httpservice');
    timeHttpService();
  });
}

//uses Google's Closure REST service to compile. Only a little bit faster than closurebuilder.py and definitely less fliexible.
function timeHttpService() {
  var patternSource = fs.readFileSync('src/pattern.js', 'utf-8'),
      post_data, opts, req;
      
  post_data = querystring.stringify({
    'compilation_level': 'ADVANCED_OPTIMIZATIONS',
    'output_format': 'text',
    'output_info': 'compiled_code',
    'warning_level': 'QUIET',
    'use_closure_library': 'true',
    'js_code': patternSource
  });
  opts = {
    host:'closure-compiler.appspot.com',
    port: 80,
    path:'/compile',
    method:'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };
  req = http.request(opts, function(res) {
    var results = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      results += chunk.toString();
    });
    res.on('end', function () {
      console.timeEnd('httpservice');
    });
  });
  req.write(post_data + '\n');
  req.end();
}