$(document).ready(function()
{
	"use strict";
	
	var filesystem = require("fs");
	
	
	window.jD = {};
	
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
	
	
	
	jD.Image = class Image
	{
		constructor(data)
		{
			this._name = data.name;
			this._source = ((typeof data.source) === "string") ? data.source : data.name;

			this._encoded = ((typeof data.encoded) === "boolean") ? data.encoded : this._source.startsWith("data:image;base64,");
		}

		getName()
		{
			return this._name;
		}

		getSource()
		{
			return this._source;
		}

		isEncoded()
		{
			return this._encoded;
		}

		toJSON()
		{
			return {
				"name": this._name,
				"source": this._source,
				"encoded": this._encoded,
			};
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
					this._images = this._images.concat(event.data.images.map((image) => { return new jD.Image(image); }));
				
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
			this._loading = [];
		}
		
	};
});