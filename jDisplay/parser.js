"use strict";

var filesystem = require("fs");

importScripts("image.js");
importScripts("../jszip.min.js");

var unrar = require("node-unrar-js");


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
		if ((asyncWait !== true) && (index >= (loading.length)))
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
		while ((asyncWait !== true) && (index <= (loading.length - 1)) && ((now - start < 50)))
		{
			asyncWait = parse(loading[index]);
			index++;
			
			now = performance.now();
		}
		
	} while (asyncWait !== true);
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
						var files = Object.values(data.files);
						//	Sort backwards because images are inserted in reverse order.
						files.sort((a, b) => { return (a.name < b.name) ? 1 : ((a.name > b.name) ? -1 : 0); });
						files = files.filter((file) =>
						{
							var lowerCase = file.name.toLowerCase();
							return lowerCase.endsWith(".jpg") ||
								lowerCase.endsWith(".png") ||
								lowerCase.endsWith(".gif") ||
								lowerCase.endsWith(".bmp");
						});
						files.forEach((file) =>
						{
							if (file.dir)
								return;
							
							loading.splice(index, 0, new ImageLoader(file.name, () =>
							{
								file.async("arraybuffer").then((data) => 
								{
									var blob = new Blob([data], {"type": 'image'});
									
									images.push(new Image({
										"name": item.getName() + "/" + file.name,
										"source": blob,
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
				var buf = Uint8Array.from(filesystem.readFileSync(item.getName())).buffer;
				var extractor = unrar.createExtractorFromData(buf);
//				var extractor = unrar.createExtractorFromFile(item.getName());

				var files = extractor.getFileList();
				if (files[0].state !== "SUCCESS")
					return;
				
				var files = files[1].fileHeaders;
				
				files.sort((a, b) => { return (a.name < b.name) ? 1 : ((a.name > b.name) ? -1 : 0); });
				files = files.filter((file) =>
				{
					var lowerCase = file.name.toLowerCase();
					return lowerCase.endsWith(".jpg") ||
						lowerCase.endsWith(".png") ||
						lowerCase.endsWith(".gif") ||
						lowerCase.endsWith(".bmp");
				}).map((file) => { return file.name; });
				
				files.forEach((file) =>
				{
					let name = file;
					loading.splice(index + 1, 0, new ImageLoader(name, () =>
					{
						var extracted = extractor.extractFiles([name], "password");
						if (extracted[0].state === "SUCCESS")
						{
							var file = extracted[1].files[0];
							
							if (file.extract[0].state === "SUCCESS")
							{
								var data = file.extract[1]; // Uint8Array 

								var blob = new Blob([data], {"type": 'image'});

								images.push(new Image({
									"name": item.getName() + "/" + file.fileHeader.name,
									"source": blob,
								}));
							}
						}
					}));
				});
			}
		}

	}

	return false;
}