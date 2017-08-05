if (!window.$)
	location.reload();

$(document).ready(function()
{
	"use strict";
	
	var filesystem = require("fs");
	
	
	nw.App.on("open", function(args)
	{
		nw.Window.open("index.html", {
			"focus": true,
			
			"new_instance": true,
			
			"frame": true,
			"width": 1280,
			"height": 720,
			"min_width": 800,
			"min_height": 600,
			"show_in_taskbar": true,
			"show": true
			
		}, function(otherWindow)
		{
			console.log(otherWindow);
		});
	});
	
	
	$.extend(
	{
		later: function(delay, func, repeat, ...parameters)
		{
			var wrapperFunction = function()
			{
				func(...parameters);
			};

			var timeout;
			if (repeat)
				timeout = window.setInterval(wrapperFunction, delay);
			else
				timeout = window.setTimeout(wrapperFunction, delay);

			return {
				id: timeout,
				interval: delay,
				repeat: repeat ? true : false,
				cancel: function()
				{
					if (repeat)
						window.clearInterval(timeout);
					else
						window.clearTimeout(timeout);
				}
			};
		},
	});
	
	
	var Util = {
		///	Proper modulus, since js '%' doesn't handle negative numbers correctly.
		"modulus": function(number, mod)
		{
			return ((number % mod) + mod)% mod;
		},
		
		"commaSeperate": function(value)
		{
			while (/(\d+)(\d{3})/.test(value.toString()))
			{
				value = value.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
			}
			
			return value;
		},
	};
	
	function clearOldSources()
	{
		var keys = Object.keys(localStorage);
		keys = keys.filter((key) => {
			return key.startsWith("savetime/");
		}).map((key) => {
			return key.substring(9);
		});

		$.each(keys, (index, key) =>
		{
			var saveTime = localStorage.getItem(`savetime/${key}`);
			if ((saveTime + (365 * 24 * 60 * 60)) < (new Date()).getTime())
			{
				localStorage.removeItem(`position/${key}`);
				localStorage.removeItem(`savetime/${key}`);
			}
		});
	}
	clearOldSources();
	
	
	
	class Loader
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
			this._loader();
		}
		
	}
	
	class Image
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
	}
	
	
	var viewer = new class
	{
		constructor()
		{
			this._imageNode = $("#image");
			
			this._source = [];
			
			this._loading = [];
			this._loadingIndex = 0;
			
			this._images = [];
			this._imageIndex = -1;
			
			this._history = [];
			this._historyIndex = -1;
			
			this._currentImage = null;
			this._loadingImage = null;
			
			
			this.updateSettings();
			
			$(window).on("storage", (event) =>
			{
				this.updateSettings();
			});
			
		}
		
		updateSettings()
		{
			this._randomize = localStorage.getItem("setting/randomize");
			if (this._randomize === null)
				this._randomize = false;
			else
				this._randomize = (this._randomize === "true");
			
			if (this._randomize)
				$("#randomize").css("background-image", "url(/icon/draw-random.png)");
			else
				$("#randomize").css("background-image", "url(/icon/draw-ordered.png)");
			
			
			this._recursive = localStorage.getItem("setting/recursive");
			if (this._recursive === null)
				this._recursive = false;
			else
				this._recursive = (this._recursive === "true");
			
			if (this._recursive)
				$("#recursive").css("background-image", "url(/icon/tree-deep.png)");
			else
				$("#recursive").css("background-image", "url(/icon/tree-shallow.png)");
		}
		
		isLoaded()
		{
			return ((this._images.length > 0) && (this._loading.length <= 0));
		}
		
		cancelLoading()
		{
			this._loading = [];
		}
		
		isRandomized()
		{
			return this._randomize;
		}
		
		toggleRandomize()
		{
			this.clearHistory();
			
			localStorage.setItem("setting/randomize", this._randomize ? "false" : "true");
			viewer.updateSettings();
		}
		
		toggleRecursive()
		{
			localStorage.setItem("setting/recursive", this._recursive ? "false" : "true");
			viewer.updateSettings();
		}
		
		init(source)
		{
			if ((typeof source) === "string")
				source = [source];
			
			source = source.filter((file) => {return file !== "";});
			if (source.length <= 0)
				return;
			
			this.terminate();
			
			this._source = source;
			
			this._imageNode.css("background-image", "");
			
			this._loading = [].concat(this._source);
			this._images = [];
			
			this._imageIndex = -1;
			this._historyIndex = -1;
			this._currentImage = null;
			
			this.load();
		}
		
		terminate()
		{
			if (!this.isLoaded())
				this.cancelLoading();
			
			if (this._source.length === 1 && this._images.length > 1)
			{
				//	Save current position
				localStorage.setItem(`position/${this._source[0]}`, this._imageIndex);
				localStorage.setItem(`savetime/${this._source[0]}`, (new Date()).getTime());
			}
			
			this._source = [];
			
			this._loading = [];
			this._loadingIndex = 0;
			
			this._images = [];
			this._imageIndex = -1;
			
			this._history = [];
			this._historyIndex = -1;
			
			this.clearLoadingImage();
			
			this._currentImage = null;
			this._loadingImage = null;
		}
		
		load()
		{
			if (this._loadingIndex < this._loading.length)
			{
				var start = performance.now();
				var now = start;
				
				var name = this._loading[this._loadingIndex];
				name = (name instanceof Loader) ? name.getName() : name;
				$("#error").text(`Parsing ${name}\n\n${Util.commaSeperate(this._loadingIndex)} of ${Util.commaSeperate(this._loading.length)} (${(this._loadingIndex / this._loading.length * 100).toFixed(2)}%)`);
				$("#bar").css("width", `${(this._loadingIndex / this._loading.length * 100)}%`);
				
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
					$.later(0, () =>
					{
						this.load();
					});
				}
				
				return;
			}
			
			this._loading = [];
			this._loadingIndex = 0;
			
			var startPosition = 0;
			if (this._source.length === 1)
			{
				var startPosition = parseInt(localStorage.getItem(`position/${this._source[0]}`));
				if (isNaN(startPosition))
					startPosition = 0;
			}
			this.next(startPosition + 1);
		}
		
		parse(fileOrDirectory)
		{
			if (fileOrDirectory instanceof Loader)
			{
				fileOrDirectory.load();
				return true;
			}
			
			fileOrDirectory = fileOrDirectory.split("\\").join("/");
			
			var stats;
			try
			{
				stats = filesystem.lstatSync(fileOrDirectory);
			}
			catch (e)
			{
				return false;
			}
			
			if (stats.isFile())
			{
				var lowerCase = fileOrDirectory.toLowerCase();
				if (lowerCase.endsWith(".jpg") ||
					lowerCase.endsWith(".png") ||
					lowerCase.endsWith(".gif") ||
					lowerCase.endsWith(".bmp"))
				{
					this._images.push(new Image(fileOrDirectory, `file:////${fileOrDirectory}`));
				}
				else if (lowerCase.endsWith(".zip") ||
					lowerCase.endsWith(".cbz"))
				{
					var content = filesystem.readFileSync(fileOrDirectory);
					var async = JSZip.loadAsync(content);
					async.then((data) =>
					{
						var files = [].concat(Object.values(data.files));
						files.sort((a, b) => { return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0); });
						$.each(files, (name, file) =>
						{
							if (file.dir)
								return;
							
							this._loading.push(new Loader(file.name, () =>
							{
								file.async("base64").then((base64) => 
								{
									this._images.push(new Image(file.name, `data:image;base64,${base64}`));
									
									$.later(0, () =>
									{
										this.load();
									});
								});
							}));
							
						});
						
						$.later(0, () =>
						{
							this.load();
						});
					});
					
					return true;
				}
				else if (lowerCase.endsWith(".rar") ||
					lowerCase.endsWith("cbr"))
				{
					
				}
				
			}
			else if (stats.isDirectory() && (this._recursive || (this._loadingIndex <= this._source.length)))
			{
				try
				{
					var content = filesystem.readdirSync(fileOrDirectory).map((file) =>
					{
						return `${fileOrDirectory}/${file}`;
					});
					this._loading = this._loading.concat(content);
				}
				catch (e)
				{
					
				}
			}
			
			return false;
		}
		
		
		clearHistory()
		{
			this._history = [this._history[this._historyIndex]];
			this._historyIndex = 0;
		};


		previous(count = 1)
		{
			if (!this.isLoaded())
				return;
			
			var nextImage = this._currentImage;
			var index = -1;

			if (this._randomize)
			{
				this._historyIndex = Math.max(this._historyIndex - count, 0);
				index = this._history[this._historyIndex];
				nextImage = this._images[index];
			}
			else
			{
				this._imageIndex = Math.max(this._imageIndex - count, 0);
				index = this._imageIndex;
				nextImage = this._images[this._imageIndex];
			}
			
			this.showImage(index);
		};
		
		begin()
		{
			this.previous(this._images.length);
		}

		next(count = 1)
		{
			if (!this.isLoaded())
				return;
			
			var nextImage = this._currentImage;
			var index = -1;
			
			if (this._randomize)
			{
				this._historyIndex = Math.max(this._historyIndex + count, this._history.length - 1);
				if (this._historyIndex >= this._history.length)
				{
					while (nextImage === this._currentImage)
					{
						this._imageIndex = Math.floor(Math.random() * this._images.length);
						nextImage = this._images[this._imageIndex];
						index = this._imageIndex;
					}
					
					this._history.push(this._imageIndex);
				}
				else
				{
					index = this._history[this._historyIndex];
					nextImage = this._images[index];
				}
			}
			else
			{
				this._imageIndex = Math.min(this._imageIndex + count, this._images.length - 1);
				nextImage = this._images[this._imageIndex];
				index = this._imageIndex;
			}
			
			this.showImage(index);
		};
		
		end()
		{
			if (this._randomize)
			{
				this.next((this._history.length - 1) - this._historyIndex);
			}
			else
			{
				this.next(this._images.length);
			}
		}
		
		
		
		
		
		showImage(index)
		{
			var image = this._images[index];
			
			$("#error").css("display", "none");
			$("#bar").css("width", `${(index / (this._images.length - 1) * 100)}%`);
			
			this.clearLoadingImage();
			
			if (!image.isEncoded())
			{
				this._loadingImage = $("<img />");
				this._loadingImage.on("error", (event) =>
				{
					$("#error").css("display", "block");
					$("#error").text(`${image.getName()}\n\nFailed to load image`);
					this._imageNode.css("background-image", "");

					this.clearLoadingImage();
				});
				this._loadingImage.on("load", (event) =>
				{
					this.clearLoadingImage();
				});
				this._loadingImage.attr("src", image.getSource());
			}
			
//			this._currentImage = file;
			this._imageNode.css("background-image", `url("${image.getSource()}")`);
			
			$("#title").text(`${image.getName()} [${index + 1} / ${this._images.length}]`);
		}
		
		clearLoadingImage()
		{
			if (this._loadingImage !== null)
				this._loadingImage.off();
			
			this._loadingImage = null;
		}
		
	};
	
	
	$("#exit").on("click", (event) =>
	{
		nw.Window.get().close();
	});
	
	$("#folder").on("click", (event) =>
	{
		$("#folder-select").trigger("click");
	});
	
	$("#recursive").on("click", (event) =>
	{
		viewer.toggleRecursive();
	});
	
	$("#fullscreen").on("click", (event) =>
	{
		nw.Window.get().toggleFullscreen();
	});
	
	$("#folder-select").on("change", function(event)
	{
		viewer.init($(this).val());
		$(this).val("");
	});
	
	$("#previous").on("click", (event) =>
	{
		viewer.previous();
	});
	
	$("#randomize").on("click", (event) =>
	{
		viewer.toggleRandomize();
	});
	
	$("#next").on("click", (event) =>
	{
		viewer.next();
	});
	
	$("#image").on("dblclick", (event) =>
	{
		nw.Window.get().toggleFullscreen();
	});
	
	$(document).on("keydown", (event) =>
	{
		switch (event.which)
		{
		case 37:	//	Left Arrow
			viewer.previous();
			break;
		case 39:	//	Right Arrow
		case 13:	//	Enter
		case 32:	//	Spacebar
			viewer.next();
			break;
		case 33:	//	Page Up
			viewer.previous(10);
			break;
		case 34:	//	Page Down
			viewer.next(10);
			break;
		case 36:	//	Home
			viewer.begin();
			break;
		case 35:	//	End
			viewer.end();
			break;
		case 122:	//	F11
			nw.Window.get().enterFullscreen();
		case 27:	//	Escape
			nw.Window.get().leaveFullscreen();
			viewer.cancelLoading();
			break;
		}
	});
	
	document.addEventListener("mousewheel", (event) =>
	{
		if (event.deltaY < 0)
		{
			viewer.previous();
		}
		else if (event.deltaY > 0)
		{
			viewer.next();
		}
	});
	
	
	$(window).on("dragover", (event) =>
	{
		event.preventDefault();
		return false;
	});
	
	$(window).on("drop", (event) =>
	{
		event.preventDefault();
		
		var files = [];
		var params = event.originalEvent.dataTransfer.files;
		for (var i=0; i<params.length; i++)
		{
			files.push(params[i]);
		}
		viewer.init(files.map((file) =>
		{
			return file.path;
		}));
		
		return false;
	});
	
	
	
	var hideTimeout = null;
	function hide()
	{
		$("#title").css("opacity", 0);
		$("#menu").css("opacity", 0);

		if (hideTimeout)
		{
			hideTimeout.cancel();
			hideTimeout = null;
		}
		$("#image").css("cursor", "none");
	}
	$("#image").on("click", hide);
	
	function startHideTimeout(event)
	{
		$("#title").css("opacity", 1);
		$("#menu").css("opacity", 1);
		
		if (hideTimeout)
		{
			hideTimeout.cancel();
			hideTimeout = null;
		}
		
		$("#image").css("cursor", "default");
		hideTimeout = $.later(1500, hide);
	}
	$("#image").on("mousemove", startHideTimeout);
	$(window).on("mouseleave", startHideTimeout);
	
	///	Prevent title from hiding while hovering over.
	$("#title").on("mouseover", (event) =>
	{
		if (hideTimeout)
		{
			hideTimeout.cancel();
			hideTimeout = null;
		}
		
		$("#title").css("opacity", 1);
		$("#menu").css("opacity", 1);
	});
	
	///	Prevent menu from hiding while hovering over.
	$("#menu").on("mouseover", (event) =>
	{
		if (hideTimeout)
		{
			hideTimeout.cancel();
			hideTimeout = null;
		}
		
		$("#title").css("opacity", 1);
		$("#menu").css("opacity", 1);
	});
	
	
	
	nw.Window.get().on("close", function()
	{
		//	Save window position.
		
		//	Save image position.
		viewer.terminate();
		
		this.close(true);
	});
	
	
});