# jDisplay
Simple image viewer

jDisplay is a simple image viewer.  

## Functions
Use it as a plain image viewer.
Use it like a comic reader similar to CDisplay.
Use it as an image randomizer.

![Screenshot](/../screenshots/screenshots/screenshot-01.jpg?raw=true "Screenshot")

## Features
* Drag and Drop files or directories to load them.
* Can recursively search for images in directories to display (with great power...).
* Can randomize selection of image to display.
* Remembers history of random images.
* Works with jpeg, png, bmp, and gifs.
* Works with Zip files; zip, cbz and Rar files; rar, cbr.
* Remembers where you left off if you load the same source folder or file.
* Supports Zooming and Dragging the image.

## Missing Features
* Support for more formats, including possibly video.
* Recursive processing of archives.

## Controls
* F11       - Enter/Exit Fullscreen
* Exc       - Exit Fullscreen / Halt Parsing
* Left      - Previous Image
* Right     - Next Image
* Spacebar  - Next Image
* Enter     - Next Image
* Page Up   - Retreat 10 Images
* Page Down - Advance 10 Images
* Home      - Go to First Image
* End       - Go to Last Image

## How To Install
For windows users download the latest release from the project's releases page. Extract the zip and run jDisplay.exe.  
For a custom install or for Linux / Mac users:  
1. Download an appropriate version of NW.js from nwjs.io/downloads/.  
2. Download the repository into a folder called 'package.nw'.
3. Move the 'package.nw' folder in to the root NW.js folder.
4. (Optional) Rename nw(.exe) to jDisplay(.exe).
5. Run nw(.exe).
6. Profit!

## Known Bugs
* The program seems to crash randomly. Does not appear to be js related.
* Zip and Rar files can crash the program if they are too large.
* Zip extracting is processed in the wrong order. Causes increased memory usage.
