(function()
{
	
	class Image
	{
		constructor(data)
		{
			this._name = data.name;
			this._source = data.source ? data.source : data.name;
		}
		
		getName()
		{
			return this._name;
		}
		
		getSource()
		{
			return this._source;
		}
		
		toJson()
		{
			return {
				"name": this._name,
				"source": this._source,
			};
		}
	};
	
	
	if ((typeof window) === 'object')
	{
		if ((typeof window.jD) !== 'object')
			window.jD = {};
		
		window.jD.Image = Image;
	}
	else if ((typeof importScripts) === 'function')
	{
		self.Image = Image;
	}
	
})();