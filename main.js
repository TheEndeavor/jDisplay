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
	
	
	
	
	
	
	
	$(window).on("storage", (event) =>
	{
		viewer.loadSettings();
		updateSettings();
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
	
	$("#fullscreen").on("click", (event) =>
	{
		nw.Window.get().toggleFullscreen();
	});
	
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
		files = files.map((file) =>
		{
			return file.path;
		});
		viewer.init(files);
		
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
		hideTimeout = $.later(2500, hide);
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
		viewer.dispose();
		
		this.close(true);
	});
	
	
});