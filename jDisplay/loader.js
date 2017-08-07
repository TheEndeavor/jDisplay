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
		constructor(name, source)
		{
			this._name = name;
			this._source = source;
			
			this._encoded = source.startsWith("data:image;base64,");
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
	};
	
	
	
	jD.Loader = class Loader
	{
		constructor(source, options, callback)
		{
			this._source = source;
			
			this._options = options;
			
			if ((typeof source) === "string")
				this._source = [source];
			
			this._loading = this._source.map((name) => {
				return new jD.ImageLoader(name.split("\\").join("/"));
			});
			this._loadingIndex = 0;
			
			this._images = [];
			
			this._callback = callback;
		}
		
		isLoading()
		{
			return this._loadingIndex < this._loading.length;
		}
		
		cancel()
		{
			this._loading = [];
		}
		
		load()
		{
			if (!this.isLoading())
			{
				this._callback({
					"done": true,
					"progress": 1,
					"index": this._loadingIndex,
					"count": this._loading.length,
				}, this._images);
				
				return;
			}
			
			var nextItem = this._loading[this._loadingIndex];
			this._callback({
				"done": false,
				"progress": this._loadingIndex / this._loading.length,
				"index": this._loadingIndex,
				"count": this._loading.length,
				"item": nextItem.getName(),
			});
			
			var start = performance.now();
			var now = start;		
			
			var async = false;
			while ((this._loadingIndex <= (this._loading.length - 1)) && ((now - start < 50)))
			{
				async = this.parse(this._loading[this._loadingIndex]);
				this._loadingIndex++;
				
				if (async)
					break;

				now = performance.now();
			}
			
			if (!async)
			{
				
				this.continueLoading();
			}
			
			console.log(this._loadCount);
		}
		
		continueLoading()
		{
			$.later(0, () =>
			{
				this.load();
			});
		}
		
		parse(item)
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
				
				if ((stats.isDirectory() && (this._options.recursive || (this._loadingIndex < this._source.length))))
				{
					try
					{
						var content = filesystem.readdirSync(item.getName()).map((file) =>
						{
							return new jD.ImageLoader(`${item.getName()}/${file}`.split("\\").join("/"));
						});
						this._loading = this._loading.concat(content);
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
						this._images.push(new jD.Image(item.getName(), `file:////${item.getName()}`));
					}
					else if (lowerCase.endsWith(".zip") ||
						lowerCase.endsWith(".cbz"))
					{
						if (this._options.recursive || (this._loadingIndex < this._source.length))
						{
							var content = filesystem.readFileSync(item.getName());
							var async = JSZip.loadAsync(content);
							async.then((data) =>
							{
								var files = [].concat(Object.values(data.files));
								files.sort((a, b) => { return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0); });
								files = files.filter((file) => { var lowerCase = file.name.toLowerCase(); return lowerCase.endsWith(".jpg") || lowerCase.endsWith(".png") || lowerCase.endsWith(".gif") || lowerCase.endsWith(".bmp"); });
								$.each(files, (name, file) =>
								{
									if (file.dir)
										return;
									
									this._loading.push(new jD.ImageLoader(file.name, () =>
									{
										file.async("base64").then((base64) => 
										{
											this._images.push(new jD.Image(file.name, `data:image;base64,${base64}`));

											this.continueLoading();
										});
										
										return true;
									}));
									
								});
								
								this.continueLoading();
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
		
	};
	
	
});