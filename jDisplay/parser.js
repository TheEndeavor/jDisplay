"use strict";

var filesystem = require("fs");

importScripts("../jszip.min.js");




class ImageLoader
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

class Image
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
	
	toJson()
	{
		return {
			"name": this._name,
			"source": this._source,
			"encoded": this._encoded,
		};
	}
};


var source = [];
var options = {};

var loading = [];
var index = 0;

var images = [];



var onmessage = function(event)
{
	var data = event.data;
	source = data["source"];
	options = data["options"];
	
	
	loading = source.map((name) => {
		return new ImageLoader(name.split("\\").join("/"));
	});
	index = 0;
	
	images = [];
	
	load();
};


function isLoading()
{
	return true;
};

function load()
{
	do
	{
		if (!asyncWait && (index >= (loading.length)))
		{
			postMessage({
				"done": true,
				"progress": 1,
				"index": index,
				"count": loading.length,
				"images": images.map((image) => { return image.toJson(); }),
			});

			close();
			return;
		}
		
		postMessage({
			"done": false,
			"progress": index / loading.length,
			"index": index,
			"count": loading.length,
			"item": loading[index].getName(),
			"images": images.map((image) => { return image.toJson(); }),
		});
		images = [];
		
		var start = performance.now();
		var now = start;
		
		var asyncWait = false;
		while ((index <= (loading.length - 1)) && ((now - start < 50)))
		{
			asyncWait = parse(loading[index]);
			index++;
			
			if (asyncWait)
				break;
			
			now = performance.now();
		}
		
	} while (!asyncWait);
}


function parse(item)
{
	if (item.hasLoader())
	{
		return item.load();
	}
	else
	{
		var stats;
		try
		{
			stats = filesystem.lstatSync(item.getName());
		}
		catch (e)
		{
			return false;
		}
		
		if ((stats.isDirectory() && (options.recursive || (index < source.length))))
		{
			try
			{
				var content = filesystem.readdirSync(item.getName()).map((file) =>
				{
					return new ImageLoader(`${item.getName()}/${file}`.split("\\").join("/"));
				});
				
				loading.push.apply(loading, content);
			}
			catch (e)
			{

			}
		}
		else
		{
			var lowerCase = item.getName().toLowerCase();
			if (lowerCase.endsWith(".jpg") ||
				lowerCase.endsWith(".png") ||
				lowerCase.endsWith(".gif") ||
				lowerCase.endsWith(".bmp"))
			{
				images.push(new Image({
					"name": item.getName(),
					"source": `file:////${item.getName()}`
				}));
			}
			else if (lowerCase.endsWith(".zip") ||
				lowerCase.endsWith(".cbz"))
			{
				if (options.recursive || (index < source.length))
				{
					var content = filesystem.readFileSync(item.getName());
					var async = JSZip.loadAsync(content);
					async.then((data) =>
					{
						var files = [].concat(Object.values(data.files));
						files.sort((a, b) => { return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0); });
						files = files.filter((file) => { var lowerCase = file.name.toLowerCase(); return lowerCase.endsWith(".jpg") || lowerCase.endsWith(".png") || lowerCase.endsWith(".gif") || lowerCase.endsWith(".bmp"); });
						files.forEach((file) =>
						{
							if (file.dir)
								return;
							
							loading.push(new ImageLoader(file.name, () =>
							{
								file.async("base64").then((base64) => 
								{
									images.push(new Image({
										"name": file.name,
										"source": `data:image;base64,${base64}`
									}));

									load();
								});

								return true;
							}));

						});

						load();
					});

					return true;
				}

				return false;

			}
			else if (lowerCase.endsWith(".rar") ||
				lowerCase.endsWith("cbr"))
			{

			}
		}

	}

	return false;
}