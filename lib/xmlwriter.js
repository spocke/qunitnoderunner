function XmlWriter(settings) {
	var data = [], stack = [], lineBreakAt;

	settings = settings || {};
	lineBreakAt = makeMap(settings.linebreak_at || 'mytag');

	function addLineBreak(name) {
		if (lineBreakAt[name] && data[data.length - 1] !== '\n') {
			data.push('\n');
		}
	};

	function makeMap(items, delim, map) {
		var i;

		items = items || [];

		if (typeof(items) == "string") {
			items = items.split(',');
		}

		map = map || {};

		i = items.length;
		while (i--) {
			map[items[i]] = {};
		}

		return map;
	};

	function encode(text) {
		var baseEntities = {
			'"' : '&quot;',
			"'" : '&apos;',
			'<' : '&lt;',
			'>' : '&gt;',
			'&' : '&amp;'
		};

		return ('' + text).replace(/[<>&\"\']/g, function(chr) {
			return baseEntities[chr] || chr;
		});
	};

	this.start = function(name, attrs, empty) {
		if (!empty) {
			stack.push(name);
		}

		data.push('<', name);

		for (var aname in attrs) {
			data.push(" " + encode(aname), '="', encode(attrs[aname]), '"');
		}

		data.push(empty ? ' />' : '>');
		addLineBreak(name);
	};

	this.end = function(name) {
		stack.pop();
		addLineBreak(name);
		data.push('</', name, '>');
		addLineBreak(name);
	};

	this.text = function(text) {
		data.push(encode(text));
	};

	this.cdata = function(text) {
		data.push('<![CDATA[', text, ']]>');
	};

	this.comment = function(text) {
		data.push('<!--', text, '-->');
	};

	this.pi = function(name, text) {
		if (text) {
			data.push('<?', name, ' ', text, '?>\n');
		} else {
			data.push('<?', name, '?>\n');
		}
	};

	this.doctype = function(text) {
		data.push('<!DOCTYPE', text, '>\n');
	};

	this.getString = function() {
		for (var i = stack.length - 1; i >= 0; i--) {
			this.end(stack[i]);
		}

		stack = [];

		return data.join('').replace(/\n$/, '');
	};

	this.reset = function() {
		data = [];
		stack = [];
	};

	this.pi(settings.xmldecl || 'xml version="1.0" encoding="UTF-8"');
};

exports.createXmlWriter = function(settings) {
	return new XmlWriter(settings);
};
