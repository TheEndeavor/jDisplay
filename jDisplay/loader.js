$(document).ready(function()
{
	"use strict";
	
	var filesystem = require("fs");
	
	
	jD.ImageLoader = class ImageLoader
	{
		constructor(name, loader = null)
		{
			this._name = name;
			
			this._loader = loader;
		}
		
		getName()
		{
			return this._name;
		}
		
		hasLoader()
		{
			return this._loader !== null;
		}
		
		load()
		{
			return this._loader();
		}
	};
	
	
	
	jD.Loader = class Loader
	{
		constructor(source, options, callback)
		{
			this._source = source;
			
			this._options = options;
			
			if ((typeof source) === "string")
				this._source = [source];
			
			this._progress = 0;
			
			this._images = [];
			
			this._callback = callback;
			
			this._callback({
				"done": false,
				"progress": 0,
				"index": 0,
				"count": this._source.length,
				"item": this._source[0],
			});
			
			
			this._parser = new Worker("/jDisplay/parser.js");
			this._parser.onmessage = (event) =>
			{
				this._progress = event.data.progress;
				
				if (event.data.images)
					this._images.push.apply(this._images, event.data.images.map((image) => { return new jD.Image(image); }));
				
				this._callback({
					"done": event.data.done,
					"progress": event.data.progress,
					"index": event.data.index,
					"count": event.data.count,
					"item": event.data.item,
					"images": this._images,
				}, this._images);
			};
			
			var data = {
				"source": this._source,
				"options": options,
			};

			this._parser.postMessage(data);
			
		}
		
		isLoading()
		{
			return this._progress !== 1;
		}
		
		cancel()
		{
			this._parser.terminate();
			
			this._callback({
				"done": true,
				"progress": 1,
				"index": 0,
				"count": 0,
				"item": "",
				"images": this._images,
			}, this._images);
		}
		
	};
});