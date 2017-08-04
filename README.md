# jDisplay
Simple image viewer

jDisplay is a simple image viewer.  
v1.0 made in a day.

## Features
* Drag and Drop files or directories to load them.
* Can recursively search for images in directories to display.
* Can randomize images to display.
* Remembers history of randomly drawn images.
* Works with jpeg, png, bmp, and gifs.
* Probably buggy because I made it in a day with very little testing.

## Missing Features
* Zooming and Dragging the image.
* Loading images from Zip Files.
* Resuming where you left off.
* Support for more formats, including possibly video.

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
For windows users download the latest release from the project's releases page. Extract the zip and run nw.exe.  
For a custom install or for Linux / Mac users:  
1. Download an appropriate version of NW.js from nwjs.io/downloads/.  
2. Download the repository into a folder called 'package.nw'.
3. Move the 'package.nw' folder in to the root NW.js folder.
4. (Optional) Rename nw(.exe) to jDisplay(.exe).
5. Run nw(.exe).
6. Profit!
