import java.io.*;
import java.net.*;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import com.google.gson.JsonSyntaxException;
import org.kohsuke.args4j.Option;
import org.kohsuke.args4j.CmdLineParser;
import org.kohsuke.args4j.CmdLineException;
import com.google.common.collect.Lists;
import com.google.common.io.LimitInputStream;
import com.google.javascript.jscomp.*;
import com.google.javascript.jscomp.Compiler;


/**
 * Sets up a TCP socket listener and handles various commands sent as JSON.
 * Commands are: echo, addFile, addFiles, getFiles, and compile.
 * After files local to the client have been added (via addFile(s)), the client will issue a compile command
 * and pass in args generally associated with the same args used with the ClosureCompiler
 * jar (see: http://code.google.com/closure/compiler/docs/api-tutorial3.html)
 *
 * @author Matt Powell (twitter.com/mattpowell)
 */
class TCPServer {


  /**
   * Simple inner-class containing a set of parameters (and their defaults) that can be passed on the cmdline.
   */
  static class Options {
    @Option(name = "-p", aliases = "--port", metaVar = "number", usage = "Sets the port to listen on.")
    Integer port = 7990;

    @Option(name = "--include-closure", usage = "True (default) preloads the entire Closure Library on start up. However, false doesn't.")
    boolean loadClosureLibrary = true;

    @Option(name = "-v", aliases = "--verbose", usage = "Will toggle verbosity of messages sent to stdout. Currently does nothing.")
    boolean isVerbose = false;
  }

  //instance of Google's Gson to handle the parse and creating of json objects.
  private static Gson gson = new Gson();

  /**
   * main method used to start ClosureCompilerService. This method will parse cmdline args, setup a listener on the tcp socket,
   * initialize the file cache, and parse client requests.
   * @param argv see Options
   * @throws Exception probably an IOExcept from ServerSocket or FileCache
   */
  public static void main(String argv[]) throws Exception {

    //options bean
    TCPServer.Options options = new TCPServer.Options();

    //setup parser to take a crack at passed in arguments
    CmdLineParser parser = new CmdLineParser(options);
    try {

      //actually do the parsing
      parser.parseArgument(argv);

    } catch (CmdLineException e) {

      //whoops, bad value or args. Tell 'em exactly what.
      System.err.println(e.getMessage());
      //now tell 'em what we can do.
      parser.printUsage(System.err);
    }

    //setup a listener to handle incoming TCP requests.
    ServerSocket server = new ServerSocket(options.port);

    //will potentially preload the entire Closure Library from within itself (lib/closure-library/) and handle the caching of files as JSSourceFiles.
    FileCache fileCache = new FileCache(options.loadClosureLibrary);


    //used to indicate that service has started to anyone listening to the stdout stream.
    System.out.println("ClosureCompilerService has STARTED.");


    while(true) {

      //we've got a connection
      Socket connectionSocket = server.accept();

      //no buffer, send stuff as soon as we've got it.
      connectionSocket.setTcpNoDelay(true);

      //stream to send data back to connectee
      DataOutputStream outToClient = new DataOutputStream(connectionSocket.getOutputStream());

      //read the incoming stream as json
      JsonReader inFromClient = new JsonReader(new InputStreamReader(connectionSocket.getInputStream(), "UTF-8"));

      //by default we won't adhere strictly to the json standard/spec
      inFromClient.setLenient(true);

      //map containing parsed json
      Map<String, Object> json = null;

      try {

        //parse the input from the tcp connection
        json = gson.fromJson(inFromClient, Map.class);

      }catch(JsonSyntaxException e){

        //coulnd't parse it. Maybe the stream wasn't finished yet? Maybe it was just a bad string?
        System.err.print("Tried to parse invalid json string. " + e);

      }

      //if it's real json AND it's got a cmd then we're in business
      if (json != null && json.containsKey("cmd")) {

        //what are we going to do.
        String cmd = (String) json.get("cmd");

        System.out.println("CMD: " + cmd);

        if (cmd.equals("compile") && json.get("args") != null){

          //pass the `args` received in the json object down to handleCompileWithArgs to be chop-suey'd in to the Closure Compiler.
          String results = handleCompileWithArgs(fileCache, (Map)json.get("args"));

          //Closure Compiler sent us back something, pass it to the client.
          send(results, outToClient);

        }else if (cmd.equals("echo") && json.containsKey("msg")){

          //I'm made of rubber, you're glue. Simple way for client to check if I'm alive.
          send(json.get("msg").toString(), outToClient);

        }else if (cmd.equals("getFiles")){

          //shortcut for client to check what files we have cached. They can either update files or not pass files in their addFile(s) call.
          send(gson.toJson(fileCache.contentCache.keySet()), outToClient);

        }else if (cmd.equals("addFile") && json.containsKey("file")){

          //file object. wil contain contents and name or path.
          Map obj = (Map)json.get("file");

          if (obj.containsKey("contents") && obj.containsKey("name")){

            //it's a named file, so, just stuff the contents in to the cache. Client will handle updating contents
            fileCache.addFile((String)obj.get("name"), (String) obj.get("contents"));

          }else if (obj.containsKey("path")){

            //if reload is true then we'll pull file from disk even if it's cached.
            boolean reload = true;
            if (obj.containsKey("reload")){
              reload = ((Boolean) obj.get("reload")).booleanValue();
            }

            if (reload || (!reload && !fileCache.isCached((String)obj.get("path")))) {

              //we'll handle reading the contents from disk and passing it to Closure Compiler
              fileCache.addFile((String)obj.get("path"));

            }

          }

          //welp, if we made it this far then we're ok. Right?
          send("OK", outToClient);

        }else if (cmd.equals("addFiles") && json.containsKey("files")){

          //they want to batch load/update files. Same as above except the file object is now inside of a files array.
          for (Map obj : (List<Map>) json.get("files")){

            if (obj.containsKey("contents") && obj.containsKey("name")){

              //same as above. Client will handle the reading of contents
              fileCache.addFile((String)obj.get("name"), (String) obj.get("contents"));

            }else if (obj.containsKey("path")){

              //same as above. if reload equals true then read from disk no matter what.
              boolean reload = true;
              if (obj.containsKey("reload")){

                reload = ((Boolean) obj.get("reload")).booleanValue();

              }

              if (reload || (!reload && !fileCache.isCached((String)obj.get("path")))) {

                //same as above. Have FileCache read from disk and convert to JSSource
                fileCache.addFile((String)obj.get("path"));

              }else {
                //TODO: add some logging here
                //System.out.println("CACHE HIT: " + obj.get("path"));
              }
            }
          }
          send("OK", outToClient);
        }else {

          //RUH ROH, we didn't understand the command. Tell the client it's an error. TODO: rework `send` to be more flexible. E.g. tell them why it's an ERROR
          send("ERROR", outToClient);
        }
      }
    }
  }


  /**
   * Sends messages back to the client as a json response.
   *
   * @param msg can be anything. will try to be coerced in to some type of object that can stuffed in to a json response.
   * @param out stream associated with the client connection.
   */
  private static void send(Object msg, DataOutputStream out){
    try{

      //json response we're going to stuff the message in to.
      Map<String, Object> response = new HashMap<String, Object>();

      /*if (json.containsKey("callback")){
        response.put("callback", json.get("callback"));
      }*/
      response.put("result", msg);

      //spit it out
      out.writeBytes(gson.toJson(response));
      //and flush
      out.flush();
      //out.close();

    }catch(IOException ioe){

      //clients no longer listening?
      System.err.print(ioe);

    }
  }


  /**
   * Handles the args passed from the client and tries to map them to ClosureCompiler commands and finally tries to run
   * the compiler and pass the results back to the client.
   *
   * @param fileCache reference to FileCache so we can grab cached JSSource files
   * @param args json args sent from client
   * @return returns the compile source from the args passed in.
   */
  private static String handleCompileWithArgs(FileCache fileCache, Map args){

    //:drum roll: THE CLOSURE COMPILER
    Compiler compiler = new Compiler();

    //options we'll set further down
    CompilerOptions options = new CompilerOptions();

    //list of js files to pass to the compiler (to be compiled)
    List<JSSourceFile> jsFiles = new ArrayList<JSSourceFile>();

    //list of externs files. Used to tell compiler about external api's to the js files.
    List<JSSourceFile> externFiles = new ArrayList<JSSourceFile>();

    //list of js files to load. passed in in json object
    List<String> files = (List<String>) args.get("js");

    //custom set of externs
    List<String> externs = (List<String>) args.get("externs");

    if (files != null){
      for (String path : files){

        //if this path/name isn't cached, but, it's full/absolute path is.
        if (!fileCache.isCached(path)){

          //get the absolute path
          path = new File(path).getAbsolutePath();
        }

        //pull JSSource from fileCache via the path. If it doesn't exist getJSSourceFile will try to read from disk before returning a result.
        jsFiles.add(fileCache.getJSSourceFile(path));
      }
    }
    /*
    for (String file : fileCache.contentCache.keySet()){
      jsFiles.add(JSSourceFile.fromCode(file, fileCache.contentCache.get(file)));
    }
    */


    // if we keep using getDefaultExterns() then we should remove the loop below AND the externs folder in lib AND the
    // logic listClosureLibraryFiles to pull externs files
    //
    //for (String extern : fileCache.externCache.keySet()){
    //  externFiles.add(fileCache.getJSSourceExtern(extern));
    //}

    try{

      //This will load Closure's default externs from a zip file included in compiler.jar.
      externFiles = getDefaultExterns();

    }catch(IOException e){

      //bummer, man. No externs today.
      e.printStackTrace(System.err);

    }


    //this will append any custom externs passed in in the json object.
    if (externs != null){
      for (Object path : externs){
        //TODO: this is faulty logic. Make this more like the jsFiles check.
        String absPath = new File((String)path).getAbsolutePath();

        //TODO: move this over to use getJSSourceExtern
        externFiles.add(fileCache.getJSSourceFile(absPath));
      }
    }



    if (args.containsKey("charset")) {

      //sets the charset to be passed back. Defaults to utf-8
      options.setOutputCharset((String)args.get("charset"));
    }

    if (args.containsKey("create_name_map_files")) {
      //TODO
    }
    if (args.containsKey("create_source_map")) {
      //TODO
    }



    //the existence of manage_closure_dependencies set the value for setManageClosureDependencies
    options.setManageClosureDependencies(args.containsKey("manage_closure_dependencies"));

    if (args.containsKey("manage_closure_dependencies") && args.containsKey("closure_entry_point")) {

      //we've got some entry points to compile for.
      Object closureEntryPoints = args.get("closure_entry_point");

      if (closureEntryPoints instanceof List) {

        //there are multiple, so pass in as a list
        options.setManageClosureDependencies((List)closureEntryPoints);

      }else if (closureEntryPoints instanceof String) {

        //it's just one, but, we'll still pass in as a list.
        options.setManageClosureDependencies(Lists.newArrayList((String) closureEntryPoints));

      }
    }

    //defaults to simple optimizations
    CompilationLevel level = CompilationLevel.SIMPLE_OPTIMIZATIONS;
    if (args.containsKey("compilation_level")) {

      //unless the client passes in compilation_level. We'll try to match compilation_level with the CompilationLevel enum
      level = CompilationLevel.valueOf((String) args.get("compilation_level"));

    }


    if (args.containsKey("define")) {
      //TODO: not sure how to do this.
    }

    if (args.containsKey("process_closure_primitives")) {

      //see closure docs for more detail
      options.closurePass = (Boolean) args.get("process_closure_primitives");

    }
    if (args.containsKey("accept_const_keyword")) {

      //see closure docs for more detail
      options.setAcceptConstKeyword((Boolean)args.get("accept_const_keyword"));

    }
    if (args.containsKey("deadAssignmentElimination")) {

      //this isn't normally an excepted keyword, but, I think this adds a lot of value so we're going to make it available here.
      options.deadAssignmentElimination = ((Boolean)args.get("deadAssignmentElimination")).booleanValue();

    }
    if (args.containsKey("removeDeadCode")) {

      //this isn't normally an excepted keyword, but, I think this adds a lot of value so we're going to make it available here.
      options.removeDeadCode = ((Boolean)args.get("removeDeadCode")).booleanValue();

    }
    if (args.containsKey("ideMode")) {

      //see closure docs for more detail
      options.ideMode = ((Boolean)args.get("ideMode")).booleanValue();

    }

    //defaults to non-debug mode.
    level.setOptionsForCompilationLevel(options);
    if (args.containsKey("debug")) {

      //see closure docs for more detail
      level.setDebugOptionsForCompilationLevel(options);

    }

    //by default we'll keep things quiet
    WarningLevel.QUIET.setOptionsForWarningLevel(options);
    if (args.containsKey("warning_level")) {

      //unless they want it to be louder
      WarningLevel.valueOf((String)args.get("warning_level")).setOptionsForWarningLevel(options);

    }

    //COMPILE IT ALL
    compiler.compile(externFiles, jsFiles, options);

    //TODO: need to figure out how to also pass map files et. al.
    return compiler.toSource();
  }

  /**
   * Graps a zip of externs hidden inside compiler.jar and "converts" them to JSSource files.
   *
   * @return list of externs pulled from compiler.jar
   * @throws IOException
   */
  private static List<JSSourceFile> getDefaultExterns() throws IOException {

    //look for the zip of externs in compiler.jar
    InputStream input = Compiler.class.getResourceAsStream("/externs.zip");

    //read the zip
    ZipInputStream zip = new ZipInputStream(input);

    //will contain the JSSourceFile version of each extern
    List<JSSourceFile> externs = Lists.newLinkedList();

    for (ZipEntry entry = null; (entry = zip.getNextEntry()) != null; ) {

      //limits size of input. potentially a little quicker.
      LimitInputStream entryStream = new LimitInputStream(zip, entry.getSize());

      //add the file to our list
      externs.add(JSSourceFile.fromInputStream(entry.getName(), entryStream));

    }

    return externs;

  }
}

/**
 * Simple class to help with reading and caching files to memory.
 *
 * @author Matt Powell (twitter.com/mattpowell)
 */
class FileCache {

  //acts as the cache for all js source files. protected because I'm cheating above for the getFiles cmd.
  protected Map<String, JSSourceFile> contentCache = new HashMap<String, JSSourceFile>();

  //acts as the cache for all extern files
  protected Map<String, JSSourceFile> externCache = new HashMap<String, JSSourceFile>();

  /**
   * Only constructor for FileCache. Will try to preload Closure Library if preloadClosure is true
   *
   * @param preloadClosure if true (default) will load the entire Closure Library in to memory.
   * @throws IOException couldn't read a file from disk
   * @throws URISyntaxException couldn't read a file from inside the jar
   */
  public FileCache(boolean preloadClosure) throws IOException, URISyntaxException {
    if (preloadClosure) {

      //looks inside of this jar for a list of files in lib/closure-library/(closure|externs)
      Map<String, Set<String>> closureFiles = listClosureLibraryFiles();

      //all the js files inside of closure/
      Set<String> closureSources = closureFiles.get("sources");

      //all the js files (externs) inside externs/
      Set<String> closureExterns = closureFiles.get("externs");


      //reads the closure library from within the jar and "caches" them as JSSourceFiles
      if (closureSources != null) {
        for (String file : closureSources){
          addFile(file, readFromJar(file));
        }
      }

      //reads some predefined extern files from within the jar and "caches" them as JSSourceFiles
      if (closureExterns != null) {
        for (String extern : closureExterns){
          addExtern(extern, readFromJar(extern));
        }
      }
    }

  }

  /**
   * Used to pull file contents from inside the jar. The path needs to be in "jar syntax".
   * No assumptions are made on lookup. File is there, or it's not. Callers should handle variations.
   *
   * @param path to file inside the jar
   * @return returns the contents of the file specified by the path
   * @throws IOException couldn't find the path in the jar
   */
  private String readFromJar(String path) throws IOException{

    //assuming the passed in path will resolve within the jar.
    InputStream is = getClass().getResourceAsStream(path);
    StringBuilder sb = new StringBuilder();
    if (is != null){

      BufferedReader reader = new BufferedReader(new InputStreamReader(is));
      String line;

      //read all lines of the stream
      while ((line = reader.readLine()) != null) {
       sb.append(line);
       //tack on a new line so we don't accidentally mess up the meaning of the file.
       sb.append(System.getProperty("line.separator"));
      }
    }
    return sb.toString();
  }

  /**
   * Checks if a named file or path has been added to the contents cache
   *
   * @param path or name of cached contents
   * @return true if path has ben cached or false if it hasn't
   */
  public boolean isCached(String path){
    //File file = new File(path);
    //return contentCache.containsKey(file.getAbsolutePath());

    //check if path already has a cache of its contents.
    //we're no longer converting a path to it's absolute path in case this is running as a remote service or
    //if ppl decide to name space their paths somehow.
    return contentCache.containsKey(path);
  }

  /**
   * Tries to get the a JSSourceFile associated with a path/named file. Tries looking for the generic path,
   * then tries to resolve the path and pull an absolute path, and if it's still not cached it'll try to read from
   * disk via addFile
   *
   * @param path or name file associated with a JSSourceFile.
   * @return the JSSourceFile.
   */
  public JSSourceFile getJSSourceFile(String path){

    if (!isCached(path)) {
      //if this path isn't cached, try it's absolute path.
      path = new File(path).getAbsolutePath();
      if (!isCached(path)){
        //whoops, not cached. try to have addFile read the file from disk first.
        addFile(path);
      }
    }

    //will pass null or the cached JSSource of the path.
    return contentCache.get(path);
  }

  public JSSourceFile getJSSourceExtern(String path){
    if (!isCached(path)) {
      //if this path isn't cached, try it's absolute path.
      path = new File(path).getAbsolutePath();
      if (!isCached(path)){
        //whoops, not cached. try to have addFile read the file from disk first.
        //addExtern(path);
      }
    }
    //will pass null or the cached JSSource of the path.
    return externCache.get(path);
  }

  /**
   * Caches an extern as a JSSourceFile
   *
   * @param name name of the extern
   * @param contents contents of the extern
   */
  public void addExtern(String name, String contents) {

    //the name and contents of this extern will be handled outside of FileCache
    JSSourceFile source = JSSourceFile.fromCode(name, contents);

    //so just stuff it in the cache.
    externCache.put(name, source);
  }

  /**
   * caches a javascript file by it's name (potentially a path) as a JSSourceFile
   * @param name generic name, acts as a key. Potentially a path.
   * @param contents actually contents of the file.
   */
  public void addFile(String name, String contents){

    //TODO: wrap this behind the verbose flag
    System.out.println("addFile: " + name);

    //the name and contents of this js source will be handled outside of FileCache
    JSSourceFile source = JSSourceFile.fromCode(name, contents);

    //so just stuff it in the cache.
    contentCache.put(name, source);
  }

  /**
   * Will try to look up a file on the disk. Not useful if this is being run as a remote service.
   * @param path path to file. can be relative or absolute.
   */
  public void addFile(String path) {

    //TODO: wrap this behind the verbose flag
    System.out.println("addFile: " + path);

    try{

      //see if we have access to the file at the specified path.
      File file = new File(path);
      Scanner scanner = new Scanner(file);
      String contents = "";
      while (scanner.hasNextLine()) {

        //get the contents of this line
        contents += scanner.nextLine();

        //only add a new line if there's another line to be read.
        if (scanner.hasNextLine()) {
          contents += System.getProperty("line.separator");
        }
      }

      //we've read the contents from disk, now add it to the cache
      addFile(path, contents);

    }catch (FileNotFoundException fnfe){
      //uh oh
      System.err.print(fnfe);
    }

  }

  /**
   * Tries to get a list of all the Closure Library files and externs that are in the lib directory of this jar
   * @return a Map of sources and externs which are sets of (path) names.
   * @throws URISyntaxException couldn't find the jar/folder
   * @throws IOException couldn't find the jar/folder
   */
  Map<String,Set<String>> listClosureLibraryFiles() throws URISyntaxException, IOException {

    //potentially a map of a list of Closure Library files and a list of externs (read from lib/closure-library/)
    Map<String, Set<String>> result = new HashMap<String, Set<String>>();

    //set of sources. set so there are no dupes.
    Set<String> sources = new HashSet<String>();

    //set of sources. set so there are no dupes.
    Set<String> externs = new HashSet<String>();

    //plug 'er in
    result.put("sources", sources);
    result.put("externs", externs);

    //used to get path to jar
    URL directory = getClass().getClassLoader().getResource("closure/");

    if (directory != null && directory.getProtocol().equals("jar")) {
      //extract actual path
      String jarPath = directory.getPath().substring(5, directory.getPath().indexOf("!"));

      //load the jar. decode path in case of spaces
      JarFile jar = new JarFile(URLDecoder.decode(jarPath, "UTF-8"));

      //enumerate ALL files.
      Enumeration<JarEntry> entries = jar.entries();
      while(entries.hasMoreElements()) {

        //file name
        String name = entries.nextElement().getName();

        //only js files and only if they're in a closure folder; closure or third_party. colud potentially paramaterize these.
        if (name.endsWith(".js") && (name.startsWith("closure/") || name.startsWith("third_party/"))) {

          sources.add(name);

        }else if (name.endsWith(".js") && name.startsWith("externs/")) {

          externs.add(name);
          
        }
      }
    }
    return result;
  }

}