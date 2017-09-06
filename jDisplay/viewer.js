$(document).ready(function()
{
	"use strict";
	
	jD.Viewer = class Viewer
	{
		constructor(data = {})
		{
			this._imageNode = jD.Util.readObject(data.imageNode, $("<img />"));
			this._titleNode = jD.Util.readObject(data.titleNode, $("<div></div>"));
			this._messageNode = jD.Util.readObject(data.messageNode, $("<div></div>"));
			this._barNode = jD.Util.readObject(data.barNode, $("<div></div>"));
			this._tabNode = jD.Util.readObject(data.tabNode, $("<img></img>"));
			this._loaderNode = jD.Util.readObject(data.loaderNode, $("<img />"));
			
			
			this._imageNode.on('dragstart', function(event)
			{
				event.preventDefault();
			});
			
			this._loader = null;
			
			this._source = null;
			this._images = [];
			this._index = -1;
			
			this._history = [];
			this._historyIndex = -1;
			
			this._zoomMode = "fill";
			this._zoom = 100;
			this._previousZoomTime = (new Date()).getTime();
			
			this._imageX = 50;
			this._imageY = 50;
			
			this._settings = new Map();
			this.loadSettings();
			
			this._loadingImage = null;
		}
		
		loadSettings()
		{
			this._loadSetting("recursive", false, "boolean");
			this._loadSetting("randomize", false, "boolean");
		}
		
		_loadSetting(name, defaultValue, type)
		{
			var value = localStorage.getItem(`setting/${name}`);
			if (value === null)
				value = defaultValue;
			
			switch (type)
			{
			case "boolean":
				value = value === "true";
				break;
			case "number":
				value = parseInt(value);
				break;
			default:
				break;
			}
			
			this._settings.set(name, value);
		}
		
		getSetting(name)
		{
			return this._settings.get(name);
		}
		
		setSetting(name, value)
		{
			this._settings.set(name, value);
			localStorage.setItem(`setting/${name}`, value);
			
			if (name === "randomize")
			{
				this._history = [this._index];
				this._historyIndex = 0;
			}
		}
		
		init(source)
		{
			this.dispose();
			
			this.cancelLoading();
			
			this._loaderNode.css("display", "block");
			this._loader = new jD.Loader(source, {"recursive": this.getSetting("recursive")}, (event, images) =>
			{
				this._messageNode.css("display", "block");
				this._messageNode.text(`Parsing ${event.item}\n\n${jD.Util.commaSeperate(event.index + 1)} of ${jD.Util.commaSeperate(event.count)} (${(event.progress * 100).toFixed(2)}%)`);
				this._barNode.css("width", `${(event.progress * 100)}%`);
				
				if (event.done)
				{
					this._messageNode.text("");
					this._barNode.css("width", "0%");
					this._loaderNode.css("display", "");
					
					if (images.length <= 0)
						this._messageNode.text("No Images Found");
					
					this._source = source;
					this._images = images;
					this._index = 0;
					
					if (this._source.length === 1)
					{
						var saved = localStorage.getItem(`source/${this._source[0]}`);
						if (saved !== null)
						{
							try
							{
								saved = JSON.parse(saved);
								this._index = Math.min($.isNumber(saved.index) ? saved.index : this._index, this._images.length - 1);
							}
							catch (e)
							{

							}
						}
					}
					
					
					this._history = [this._index];
					this._historyIndex = 0;
					
					this._loader = null;
					
					this._tabNode.css("display", "block");
					
					this.show();
				}
			});
			
//			this._loader.continueLoading();
		}
		
		cancelLoading()
		{
			if (this._loader !== null)
				this._loader.cancel();
		}
		
		dispose()
		{
			if (!this.isReady())
				return;
			
			if (this._source.length === 1)
			{
				if (this._index > 0)
				{
					//	Save current position.
					localStorage.setItem(`source/${this._source[0]}`, JSON.stringify({
						"index": this._index,
						"lastAccess": (new Date()).getTime(),
					}));
				}
				else
				{
					//	Current position is 0 so we can remote it to save space.
					localStorage.removeItem(`source/${this._source[0]}`);
				}
			}
			
			this._source = null;
			this._images = [];
			this._index = -1;
			
			this._history = [];
			this._historyIndex = -1;
			
			this._zoomMode = "fill";
			this._zoom = 100;
			
			this.clearImage();
			
			this.clearLoadingImage();
			
			this._barNode.css("width", "");
			this._tabNode.css("display", "");
			
			this._titleNode.find(".name").text("");
			this._titleNode.find(".counter").text("");
			this._titleNode.find(".scale").text("");
		}
		
		isReady()
		{
			return (this._images.length > 0);
		}
		
		getIndex()
		{
			return this._index;
		}
		
		getCount()
		{
			return this._images.length;
		}
		
		getImageName()
		{
			if (!this.isReady())
				return "";
			return this._images[this._index].getName();
		}
		
		updateTopLeft()
		{
			if (this._zoomMode === "zoom")
				this._titleNode.find(".scale").text(`${this._zoom}% (${this.getImageX().toFixed(0)}% ${this.getImageY().toFixed(0)}%)`);
			else
				this._titleNode.find(".scale").text("Fill");
		}
		
		getZoom()
		{
			return this._zoom;
		}
		
		setZoom(zoom)
		{
			if (this._zoomMode === "fill")
				this.toggleZoom();
			
			this._zoom = Math.min(Math.max(zoom, 0), 999);
			this._imageNode.css("zoom", `${this._zoom}%`);
			
			this.ensurePosition();
			
			this.updateTopLeft();
		}
		
		zoomIn(amount)
		{
			if (this._zoomMode === "fill")
				this.toggleZoom();
			
			var currentTime = (new Date()).getTime();
			var change = Math.max(Math.round((1 + (300 - (currentTime - this._previousZoomTime)) / 50) * (this._zoom / 100)), 1);
			this._previousZoomTime = currentTime;
			
			this.setZoom(this._zoom + change);
		}
		
		zoomOut(amount)
		{
			if (this._zoomMode === "fill")
				this.toggleZoom();
			
			var currentTime = (new Date()).getTime();
			var change = Math.max(Math.round((1 + (300 - (currentTime - this._previousZoomTime)) / 50) * (this._zoom / 100)), 1);
			this._previousZoomTime = currentTime;
			
			this.setZoom(this._zoom - change);
		}
		
		toggleZoom()
		{
			if (this._zoomMode === "fill")
			{
				this._zoomMode = "zoom";
				this._zoom = 100;
				
				this._imageNode.addClass("zoomed");
				this._imageNode.css("zoom", "100%");
				
				this.positionImage(50, 50);
			}
			else
			{
				this.positionImage(50, 50);
				
				this._zoomMode = "fill";
				
				this._imageNode.removeClass("zoomed");
				this._imageNode.css("zoom", "");
			}
			
			this.updateTopLeft();
		}
		
		getImageX()
		{
			return this._imageX;
		}
		
		getImageY()
		{
			return this._imageY;
		}
		
		positionImage(x, y)
		{
			if (this._zoomMode !== "zoom")
				return;
			
			this._imageX = x;
			this._imageY = y;
			
			this._imageNode.css("object-position", `${this._imageX}% ${this._imageY}%`);
			
			this.updateTopLeft();
		}
		
		ensurePosition()
		{
			var imageX = this.getImageX();
			var imageY = this.getImageY();

			if (this.getImageWidth() < $(window).width())
				imageX = 50;

			if (this.getImageHeight() < $(window).height())
				imageY = 50;
		
			this.positionImage(imageX, imageY);
		}
		
		previous(count = 1)
		{
			if (this.isLoadingImage())
				return;
			
			if (this.getSetting("randomize"))
			{
				this._historyIndex = Math.max(this._historyIndex - count, 0);
				this._index = this._history[this._historyIndex];
			}
			else
			{
				if (this._index === 0)
					return;
				
				this._index = Math.max(this._index - count, 0);
			}
			
			this.show();
		}
		
		begin()
		{
			this.previous(this._images.length);
		}
		
		next(count = 1)
		{
			if (this.isLoadingImage())
				return;
			
			if (this.getSetting("randomize"))
			{
				this._historyIndex = Math.min(this._historyIndex + count, this._history.length);
				var nextIndex = this._index;
				if (this._historyIndex >= this._history.length)
				{
					while (nextIndex === this._index)
						nextIndex = Math.floor(Math.random() * this._images.length);
					
					this._index = nextIndex;
					this._history.push(this._index);
				}
				else
				{
					this._index = this._history[this._historyIndex];
				}
			}
			else
			{
				if (this._index === (this._images.length - 1))
					return;
				
				this._index = Math.min(this._index + count, this._images.length - 1);
			}
			
			this.show();
		}
		
		end()
		{
			if (this.getSetting("randomize"))
			{
				this.next((this._history.length - 1) - this._historyIndex);
			}
			else
			{
				this.next(this._images.length);
			}
		}
		
		set(index)
		{
			if (this._index === index)
				return;
			
			this._index = Math.min(Math.max(index, 0), this._images.length - 1);
			this.show();
		}
		
		show(index = -1)
		{
			if (this._images.length <= 0)
			{
				this.clearImage();
				return;
			}
			
			if (index < 0)
				index = this._index;
			
			var image = this._images[index];
			
			this._messageNode.css("display", "none");
			this._barNode.css("width", `${(index / (this._images.length - 1) * 100)}%`);
			this._tabNode.css("left", `${(index / (this._images.length - 1) * 100)}%`);
			
			this.clearLoadingImage();
			
			var url = image.getSource();
			if (url instanceof Blob)
			{
				url = URL.createObjectURL(image.getSource());
			}
			
			this._loadingImage = $("<img />");
			this._loadingImage.on("load", (event) =>
			{
				this.setImage(url);
				this.clearLoadingImage();
				this.positionImage(50, 50);
			});
			this._loadingImage.on("error", (event) =>
			{
				this._messageNode.css("display", "block");
				this._messageNode.text(`${image.getName()}\n\nFailed to load image`);
				this.clearImage();
				
				this.clearLoadingImage();
			});
			this._loadingImage.attr("src", url);
			
			
			this._titleNode.find(".name").text(image.getName());
			this._titleNode.find(".counter").text(`${jD.Util.commaSeperate(index + 1)} / ${jD.Util.commaSeperate(this._images.length)}`);
			this.updateTopLeft();
		}
		
		setImage(src)
		{
			this._imageNode.attr("src", src);
		}
		
		clearImage()
		{
			this.setImage("data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D");
		}
		
		isLoadingImage()
		{
			return this._loadingImage !== null;
		}
		
		clearLoadingImage()
		{
			if (this._loadingImage !== null)
				this._loadingImage.off();
			
			this._loadingImage = null;
		}
		
		getImageWidth()
		{
			return this._imageNode[0].naturalWidth * (this._zoom / 100);
		}
		
		getImageHeight()
		{
			return this._imageNode[0].naturalHeight * (this._zoom / 100);
		}
		
	};
	
});
