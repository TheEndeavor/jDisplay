$(document).ready(function()
{
	"use strict";
	
	var filesystem = require("fs");
	
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
	
	
	/**
		Proper modulus, since js '%' doesn't handle negative numbers correctly.
	**/
	function modulus(number, mod)
	{
		return ((number % mod) + mod)% mod;
	};
	
	function commaSeperate(value)
	{
		while (/(\d+)(\d{3})/.test(value.toString()))
		{
			value = value.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
		}
		
		return value;
	};
	
	
	var viewer = new class
	{
		constructor()
		{
			this._imageNode = $("#image");
			
			this._directory = null;
			this._loading = [];
			this._firstSet = 0;
			this._loadingIndex = 0;
			
			this._images = [];
			this._drawIndex = -1;
			
			this._history = [];
			this._historyIndex = -1;
			
			this._currentImage = null;
			this._loadingImage = null;
			
			
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
			
			this._randomize = !this._randomize;
			localStorage.setItem("setting/randomize", this._randomize ? "true" : "false");
			
			if (this._randomize)
				$("#randomize").css("background-image", "url(/icon/draw-random.png)");
			else
				$("#randomize").css("background-image", "url(/icon/draw-ordered.png)");
		}
		
		toggleRecursive()
		{
			this._recursive = !this._recursive;
			localStorage.setItem("setting/recursive", this._recursive ? "true" : "false");
			
			if (this._recursive)
				$("#recursive").css("background-image", "url(/icon/tree-deep.png)");
			else
				$("#recursive").css("background-image", "url(/icon/tree-shallow.png)");
		}
		
		init(files)
		{
			if (typeof(files) === "string")
				files = [files];
			
			files = files.filter((file) => {return file !== "";});
			if (files.length <= 0)
				return;
			
			this._imageNode.css("background-image", "");
			
			this._loading = files;
			this._firstSet = this._loading.length;
			this._images = [];
			
			this._drawIndex = -1;
			this._historyIndex = -1;
			this._currentImage = null;
			this.load();
		}
		
		load()
		{
			if (this._loadingIndex < this._loading.length)
			{
				var start = performance.now();
				var now = start;
				while ((this._loadingIndex <= (this._loading.length - 1)) && ((now - start < 50)))
				{
					this.parse(this._loading[this._loadingIndex], this._loadingIndex <= this._firstSet);
					this._loadingIndex++;
					
					now = performance.now();
				}
				
				$("#error").text(`Parsing ${this._loading[this._loadingIndex]}\n\n${commaSeperate(this._loadingIndex)} of ${commaSeperate(this._loading.length)} (${(this._loadingIndex / this._loading.length * 100).toFixed(2)}%)`);
				$("#error").css("display", "block");
				
				$.later(0, () =>
				{
					this.load();
				});
				
				return;
			}
			
			this._loading = [];
			this._loadingIndex = 0;
			this.next();
		}
		
		parse(fileOrDirectory, firstSet)
		{
			fileOrDirectory = fileOrDirectory.split("\\").join("/");
			
			var stats;
			try
			{
				stats = filesystem.lstatSync(fileOrDirectory);
			}
			catch (e)
			{
				return;
			}
			
			if (stats.isFile())
			{
				var lowerCase = fileOrDirectory.toLowerCase();
				if (lowerCase.endsWith(".jpg") ||
					lowerCase.endsWith(".png") ||
					lowerCase.endsWith(".gif") ||
					lowerCase.endsWith(".bmp"))
				{
					this._images.push(fileOrDirectory);
				}
			}
			else if (stats.isDirectory() && (this._recursive || firstSet))
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
			
			/*
			
			var files = [];
			try
			{
				files = filesystem.readdirSync(directory);
			}
			catch (e)
			{
				
			}
			
			var directories = [];
			if (this._recursive)
			{
				var directories = files.filter((file) =>
				{
					file = `${directory}/${file}`;
					file = file.split("\\").join("/");
					
					try
					{
						var stats = filesystem.lstatSync(file);
						return stats.isDirectory();
					}
					catch (e)
					{
						return false;
					}
				}).map((folder) => {
					var folder = `${directory}/${folder}`;
					folder = folder.split("\\").join("/");

					return folder;
				});
			}
			
			files = files.filter((file) =>
			{
				file = `${directory}/${file}`;
				file = file.split("\\").join("/");
				
				try
				{
					var stats = filesystem.lstatSync(file);
					if (!stats.isFile())
						return false;
				}
				catch (e)
				{
					return false;
				}
				
				var lowerCase = file.toLowerCase();
				return lowerCase.endsWith(".jpg") ||
					   lowerCase.endsWith(".png") ||
					   lowerCase.endsWith(".gif") ||
					   lowerCase.endsWith(".bmp");
			}).map((file) => {
				var image = `${directory}/${file}`;
				image = image.split("\\").join("/");
				
				return image;
			});
			
			this._loading = this._loading.concat(directories);
			
			return files;
			
			*/
		}
		
		
		clearHistory()
		{
			this._history = [this._history[this._historyIndex]];
			this._historyIndex = 0;
		};


		previous(advance = 1)
		{
			if (!this.isLoaded())
				return;
			
			var nextImage = this._currentImage;
			var index = -1;

			if (this._randomize)
			{
				this._historyIndex = Math.max(this._historyIndex - advance, 0);
				index = this._history[this._historyIndex];
				nextImage = this._images[index];
			}
			else
			{
				this._drawIndex = Math.max(this._drawIndex - advance, 0);
				index = this._drawIndex;
				nextImage = this._images[this._drawIndex];
			}
			
			this.showImage(index);
		};
		
		begin()
		{
			this.previous(this._images.length);
		}

		next(advance = 1)
		{
			if (!this.isLoaded())
				return;
			
			var nextImage = this._currentImage;
			var index = -1;
			
			if (this._randomize)
			{
				this._historyIndex = Math.max(this._historyIndex + advance, this._history.length - 1);
				if (this._historyIndex >= this._history.length)
				{
					while (nextImage === this._currentImage)
					{
						this._drawIndex = Math.floor(Math.random() * this._images.length);
						nextImage = this._images[this._drawIndex];
						index = this._drawIndex;
					}
					
					this._history.push(this._drawIndex);
				}
				else
				{
					index = this._history[this._historyIndex];
					nextImage = this._images[index];
				}
			}
			else
			{
				this._drawIndex = Math.min(this._drawIndex + advance, this._images.length - 1);
				nextImage = this._images[this._drawIndex];
				index = this._drawIndex;
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
		
		showImage(file)
		{
			var index = -1;
			if (typeof(file) === "number")
			{
				index = file;
				file = this._images[file];
			}
			
			$("#error").css("display", "none");
			
			if (this._loadingImage !== null)
			{
				this._loadingImage.off("error");
			}
			
			this._loadingImage = $("<img />");
			this._loadingImage.on("error", (event) =>
			{
				$("#error").css("display", "block");
				$("#error").text(`${file}\n\nFailed to load image`);
				this._imageNode.css("background-image", "");
			});
			this._loadingImage.attr("src", file);
			
			this._currentImage = file;
			this._imageNode.css("background-image", `url("file:////${file}")`);
			
			if (index >= 0)
				$("#title").text(`${file} [${index + 1} / ${this._images.length}]`);
			else
				$("#title").text(file);
		}
		
	};
	
	
	$("#exit").on("click", (event) =>
	{
		nw.App.quit();
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
		case 39:	//	Right Arrow
		case 13:	//	Enter
		case 32:	//	Spacebar
			viewer.next();
			break;
		case 37:	//	Left Arrow
			viewer.previous();
			break;
		case 34:	//	Page Down
			viewer.next(10);
			break;
		case 33:	//	Page Up
			viewer.previous(10);
			break;
		case 35:	//	End
			viewer.end();
			break;
		case 36:	//	Home
			viewer.begin();
			break;
		case 122:	//	F11
			nw.Window.get().enterFullscreen();
		case 27:	//	Escape
			nw.Window.get().leaveFullscreen();
			viewer.cancelLoading();
			break;
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
});