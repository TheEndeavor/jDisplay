//	Weird bug with NW.js where scripts load wrong the first time?
if (!window.$)
	location.reload();

$(document).ready(function()
{
	"use strict";
	
	var filesystem = require("fs");
	
	function generateUuidV4()
	{
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
		{
			var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}
	var uuid = generateUuidV4();
	
	
	
	$.extend(
	{
		isValue: function(toTest)
		{
			var type = $.type(toTest);
			if (type === "null" || type === "undefined")
				return false;

			return true;
		},

		isBoolean: function(toTest)
		{
			return $.type(toTest) === "boolean";
		},

		isNumber: function(toTest)
		{
			return $.type(toTest) === "number";
		},

		isString: function(toTest)
		{
			return $.type(toTest) === "string";
		},

		isObject: function(toTest)
		{
			return $.type(toTest) === "object";
		},

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
	
	
	jD.Util = {
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
		
		"readValue": function(data, defaultValue = null)
		{
			if ($.isValue(data))
			{
				return data;
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},
		
		

		"readBoolean": function(data, defaultValue = false)
		{
			if ($.isBoolean(data))
			{
				return data;
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},

		"readNumber": function(data, defaultValue = 0, min, max)
		{
			if ($.isNumber(data))
			{
				return SC.Util.clamp(data, min, max);
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},
		
		"readString": function(data, defaultValue = "", validValues)
		{
			if ($.isString(data))
			{
				if ($.isArray(validValues))
				{
					for (var i=0; i<validValues.length; i++)
					{
						if (data === validValues[i])
						{
							return data;
						}
					}
					return defaultValue;
				}
				return data;
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},
		
		"readObject": function(data, defaultValue = {})
		{
			if ($.isObject(data))
			{
				return data;
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},
		
		"readArray": function(data, defaultValue = [])
		{
			if ($.isArray(data))
			{
				return data;
			}
			
			if ($.isFunction(defaultValue))
				return defaultValue();
			
			return defaultValue;
		},
		
		"readFunction": function(data, defaultValue)
		{
			if ($.isString(data))
			{
				try
				{
					eval("data = " + data);
				}
				catch (e)
				{
					console.log(e.stack);
				}
			}
			
			if ($.isFunction(data))
			{
				return data;
			}
			
			return defaultValue;
		},
	};
	
	
	(function clearOldSources()
	{
		var keys = Object.keys(localStorage);
		keys = keys.filter((key) => {
			return key.startsWith("source/");
		});
		
		$.each(keys, (index, key) =>
		{
			var data = localStorage.getItem(key);
			if (data !== null)
			{
				try
				{
					data = JSON.parse(data);
					if ((data.lastAccess + (365 * 24 * 60 * 60)) < (new Date()).getTime())
					{
						localStorage.removeItem(key);
					}
				}
				catch (e)
				{

				}
			}
		});
	})();
	
	
	
	
	
	function updateUpenListener()
	{
		nw.App.removeAllListeners("open");
		
		var listener = localStorage.getItem("openListener");
		if ((listener === null) || (listener === uuid))
		{
			localStorage.setItem("openListener", uuid);
			nw.App.on("open", function(args)
			{
				console.log(`${uuid} opens new window.`);
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
					
				});
			});
		}
	}
	updateUpenListener();
	
	
	$(window).on("storage", (event) =>
	{
		viewer.loadSettings();
		updateSettings();
		
		updateOpenListener();
	});
	
	function updateSettings()
	{
		if (viewer.getSetting("randomize"))
			$("#randomize").css("background-image", "url(/icon/draw-random.png)");
		else
			$("#randomize").css("background-image", "url(/icon/draw-ordered.png)");

		if (viewer.getSetting("recursive"))
			$("#recursive").css("background-image", "url(/icon/tree-deep.png)");
		else
			$("#recursive").css("background-image", "url(/icon/tree-shallow.png)");
	};
	
	var viewer = new jD.Viewer({
		"imageNode": $("#image"),
		"titleNode": $("#title"),
		"messageNode": $("#message"),
		"barNode": $("#bar"),
		"tabNode": $("#tab"),
		"loaderNode": $("#loader"),
	});
	updateSettings();
	
	
	
	
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
		viewer.setSetting("recursive", !viewer.getSetting("recursive"));
		updateSettings();
	});
	
	$("#randomize").on("click", (event) =>
	{
		viewer.setSetting("randomize", !viewer.getSetting("randomize"));
		viewer.loadSettings();
		updateSettings();
	});
	
	
	var cherryIndex = Math.floor(Math.random() * 7) + 1;
	$("#cake").on("click", (event) =>
	{
		cherryIndex--;
		if (cherryIndex <= 0)
		{
			$("#cake").css("background-image", `url("/icon/cake-cherry.png")`);
			cherryIndex = Math.floor(Math.random() * 7) + 1;
		}
		else
		{
			$("#cake").css("background-image", `url("/icon/cake-plain.png")`);
		}
		
		
	});
	
	$("#zoom").on("click", (event) =>
	{
		viewer.toggleZoom();
	});
	
	$("#fullscreen").on("click", (event) =>
	{
		nw.Window.get().toggleFullscreen();
	});
	
	$("#about").on("click", (event) =>
	{
		showAbout();
	});
	
	$("#about-modal").on("click", (event) =>
	{
		hideAbout();
	});
	
	function showAbout()
	{
		$("#about-modal").css("width", "100%");
		$("#about-modal").css("height", "100%");
		$("#about-modal").css("opacity", "1");
	}
	
	function hideAbout()
	{
		$("#about-modal").css("width", "");
		$("#about-modal").css("height", "");
		$("#about-modal").css("opacity", "0");
	}
	
	
	$("#folder-select").on("change", function(event)
	{
		viewer.init([$(this).val()]);
		
		$(this).val("");
	});
	
	$("#previous").on("click", (event) =>
	{
		viewer.previous();
	});
	
	$("#next").on("click", (event) =>
	{
		if (viewer !== null)
		{
			viewer.next();
		}
	});
	
	
	{
		//	Image Dragger
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();
		
		var mouseStartX = 0;
		var mouseStartY = 0;
		
		var imageStartX = 0;
		var imageStartY = 0;
		
		function mouseMove(event)
		{
			var mouseX = event.clientX;
			var mouseY = event.clientY;
			
			var imageX = 50;
			var imageY = 50;
			
			var imageNode = $("#image");
			if (viewer.getImageWidth() > windowWidth)
			{
				var offsetX = (mouseStartX - mouseX) / (viewer.getImageWidth() - windowWidth);
				imageX = Math.min(Math.max(imageStartX + offsetX * 100, 0), 100);
			}
			
			if (viewer.getImageHeight() > windowHeight)
			{
				var offsetY = (mouseStartY - mouseY) / (viewer.getImageHeight() - windowHeight);
				imageY = Math.min(Math.max(imageStartY + offsetY * 100, 0), 100);
			}
			
			viewer.positionImage(imageX, imageY);
			
			$("#image").css("cursor", "-webkit-grabbing");
		}
		
		function mouseUp(event)
		{
			$(document).off("mousemove", mouseMove);
			$(document).off("mouseup", mouseUp);
			
			$("#image").css("cursor", "");
		}
		
		$("#image").on("mousedown", function(event)
		{
			$(document).on("mousemove", mouseMove);
			$(document).on("mouseup", mouseUp);
			
			windowWidth = $(window).width();
			windowHeight = $(window).height();
			
			mouseStartX = event.clientX;
			mouseStartY = event.clientY;
			
			imageStartX = viewer.getImageX();
			imageStartY = viewer.getImageY();
			
			$("#image").css("cursor", "-webkit-grabbing");
			console.log($("#image").css("cursor"));
			
			event.stopPropagation();
			
			return false;
		});
	}
	
	{
		//	Tab Slider
		
		function mouseMove(event)
		{
			var mousePos = event.clientX;
			var width = $(window).width();
			
			var index = Math.round((mousePos / width) * (viewer.getCount() - 1));
			viewer.set(index);
		}
		
		function mouseUp(event)
		{
			$(document).off("mousemove", mouseMove);
			$(document).off("mouseup", mouseUp);
		}
		
		$("#tab").on("mousedown", function(event)
		{
			$(document).on("mousemove", mouseMove);
			$(document).on("mouseup", mouseUp);
			
			event.stopPropagation();
			
			return false;
		});
	}
	
	$("#image").on("dblclick", (event) =>
	{
		nw.Window.get().toggleFullscreen();
	});
	
	$(document).on("keydown", (event) =>
	{
		hideAbout();
		
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
			break;
		case 27:	//	Escape
			nw.Window.get().leaveFullscreen();
			viewer.cancelLoading();
			break;
		case 48:	//	Key 0
			if (event.ctrlKey)
				viewer.setZoom(100);
			break;
		}
	});
	
	document.addEventListener("mousewheel", (event) =>
	{
		hideAbout();
		
		if (event.ctrlKey === true)
		{
			if (event.deltaY < 0)
				viewer.zoomIn(-event.deltaY);
			else if (event.deltaY > 0)
				viewer.zoomOut(event.deltaY);
		}
		else
		{
			if (event.deltaY < 0)
				viewer.previous();
			else if (event.deltaY > 0)
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
		files = files.map((file) =>
		{
			return file.path;
		});
		viewer.init(files);
		
		return false;
	});
	
	
	
	var hideTimeout = null;
	function hideUi()
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
	$("#image").on("click", hideUi);
	
	function startHideTimeout(event)
	{
		$("#title").css("opacity", 1);
		$("#menu").css("opacity", 1);
		
		if (hideTimeout)
		{
			hideTimeout.cancel();
			hideTimeout = null;
		}
		
		$("#image").css("cursor", "");
		hideTimeout = $.later(2500, hideUi);
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
	
	
	$(window).on("resize", (event) =>
	{
		viewer.ensurePosition();
	});
	
	
	nw.Window.get().on("close", function()
	{
		//	Save window position.
		
		//	Save image position.
		viewer.dispose();
		
		localStorage.removeItem("openListener");
		this.close(true);
	});
	
	
});