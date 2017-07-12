PhotoAlbum.js is a simple photo album generator written using node.js.

The main goal is to produce static files to put on a simple web-server and be able to write legends below the images.

Node.js modules required:

*  imagemagick,
*  mime.

It uses:

*   jquery,
*   markdown.js,
*   tipsy.js,
*   jquery-ui, only for the editor.

The background can be found at http://subtlepatterns.com/black-paper/ .
The icons were generated from the ones at http://raphaeljs.com/icons/ .


## How to use it

1. Install the node.js modules;
  *  npm install imagemagick
  *  npm install mime
2. Have all your images in a directory `in`
3. Generate a configuration file:
```
./photoalbum.js config in/ config.json
```
4. Generate the editor from that configuration file:
```
./photoalbum.js editor config.json
```
5. Launch the server to edit the configuration file:
```
./photoalbum.js server config.json
```
6. Open your brower at `http://localhost:8080/editor.html` and edit your pictures.
7. Render all the files:
```
./photoalbum.js render config.json
```


Your photoalbum is in the output directory you configured in the editor.


