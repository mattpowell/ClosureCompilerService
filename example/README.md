Readme
=========

This is a quick example of how I'd interact with ClosureCompilerService using node.js/php/python/java. It's making the assumption that all of your js files are namespaced using `goog.provide` and `goog.require`. In a future example, I'll try to demo what it'd look like compiling files that don't use Closure Library so extensively. I'm writing another project (TBA later ;) that actually utilizes ClosureCompilerService and other than the dependency lookup via closurebuilder.py this is pretty close to what I'm using. However, I'd just like to reiterate that this is just a demo of how to interact with the service. Not all of the "features" are completely fleshed out and the way I'm doing some things aren't exactly optimal. However, instead of complaining about how crappy the code is, I'll just tell you what it's doing :)

node-example.js
---------------
Makes use of a tiny lib I wrote (where all the hackery is) to run code through ClosureCompilerService, closurebuilder.py, and Google's REST service and collect the times. ClosureCompilerService is (usually) significantly faster than both closurebuilder.py and the REST service; [insert note about REST service being less flexible :]. The ClosureCompilerService lib tries to do the following:

* Determine dependencies of a `goog.provide`'d namespace using closurebuilder.py and looking in source directories provided in node-example.js.
* Add `fs.watchFile`'s to all dependencies including the provider of the watched namespace.
* While the `fs.watchFile` loop is running, we'll cache all the dependencies in ClosureCompilerService (so the actual compilation is quick).
* If a watched file is changed then we'll re-add to ClosureCompilerService, compile the entryPoint, and fire the callback for the `watch` listener (with the compiled source as the first parameter).

The lib will also try to spin up an instance of ClosureCompilerService if `closureCompilerServiceJar` is provided. 

php-example.php
---------------
TBD

python-example.py
---------------
TBD

java-example.java
---------------
TBD

Apache OutputFilter
-------------------
TBD (in the meantime, see: https://gist.github.com/1196209)


Final note
---------------

This was meant to be an example of how to get up and running with the service, however, I am interested in continuing to flesh out the libs and make them easier to use for the more generic use cases. So, feel free to open pull requests, issues, or send me feedback (twitter.com/mattpowell).

  
  