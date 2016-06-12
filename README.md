# htcachemon

htcachemon is a tool to view statistics about entries in an Apache
`mod_disk_cache` cache. Users can also manually purge URLs from the cache.
It uses the Apache `htcacheclean` tool in the back-end to accomplish this.


## Security

Both the server component and the web interface should be secured from
unauthorised access. Exactly what measures you take to achieve that is
left as an exercise for the reader.


## Installation

### API Server

You will need to have node.js and the Apache `htcacheclean` utility 
installed and, of course, an Apache server and a `mod_cache_disk` cache.

1. Clone the git repository at <git@github.com:stainsby/htcachemon.git>.
2. `cd` into your cloned repository and run `npm install` to install the NPM 
packages that the server component depends on.
3. Edit `<repo>/config.js` to suit your system. Common items to change will 
be `cacheDir`, `uid` and `http.port`.
4. Run the server with the user corresponding to `uid` in the  `config.js` 
file. The `serve.sh` script provides an example of this.


### Web interface

The web interface is just a set of static files to create an AngularJS
single page application. All dependencies are provided (or come from CDNs).

1. Adjust `<repo>/ui/config.js` to suit your system. You will
   likely need to change the API endpoint.
2. Configure your web server to serve the files in `<repo>/ui`.