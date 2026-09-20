
const DataType = {
	// The difference between Wii U and Switch title ids is in the sort order.
	// Switch title ids have a random and an incrementing part. They are sorted
	// by the incrementing part.

	String:   0, // Simple string
	Int:      1, // Number
	TitleID:  2,
	Bool:     3, // "Yes" or "No"
	Version:  4, // Version number, e.g. "v5"
	Size:     5, // Size in bytes, e.g. "1.2 KB"
	Lib:      6, // Library version number with an optional suffix, e.g. "1.5.0-xx"
	Address:  7, // IP address and port
	HexInt:   8, // Hexadecimal integer
}

sortIndex = 0; // Index of the column that is sorted
sortReverse = false; // false if ascending, true if descending

function fmtLibOne(e) {
    var s = e[0].join(".");
    if (e.length == 2) s += "-" + e[1];
    return s;
}

formatters = {
	[DataType.String]: function(v) { return v; },
	[DataType.Int]:
        function(v) {
            if (v === null || v === undefined) return "";
            return v.toString();
        },
	[DataType.TitleID]:
		function(v) {
			return v.toString(16).toUpperCase().padStart(16, '0');
		},
	[DataType.Bool]: function(v) { return v ? "Yes" : "No"; },
	[DataType.Version]: function(v) { return "v" + v; },
	[DataType.Size]:
		function(v) {
			var steps = 0;
			var frac = 0;
			while (v >= 1000) {
				frac = v % 1000;
				v = Math.floor(v / 1000);
				steps++;
			}
			
			if (steps == 0) return v + " B";
			else {
				return v + "." + Math.floor(frac / 100) + " " + ["KB", "MB", "GB"][steps - 1];
			}
		},
    [DataType.Lib]:
        function(v) {
            if (v === null || v === undefined) return "";
            if (v.length == 0) return "Yes";
			
            if (Array.isArray(v[0][0])) {
                return v.map(fmtLibOne).join(", ");
            }
            return fmtLibOne(v);
		},
	[DataType.Address]:
		function(v) {
            if (v === null || v === undefined || v.length === 0) return "";
			return `${v[0]} (${v[1]})`
		},
	[DataType.HexInt]:
		function(v) {
			return v.toString(16).toLowerCase();
		},
}

function getLocName(game, prefix) {
	var lang = document.getElementById("lang").value;
	var value;

	value = game[prefix + lang];
	if (value !== undefined && value !== null && value !== "") {
		return value;
	}

	value = game[prefix + "en"];
	if (value !== undefined && value !== null && value !== "") {
		return value;
        }

	for (var key in game) {
		if (!key.startsWith(prefix)) 
            continue

        value = game[key];
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
	}

	return "";
}

function formatField(game, field) {
	var value;
	var key = field.key;
	var type = field.type;

    switch (key) {
        case "name":
            value = getLocName(game, "name_");
            break;
        case "nameshort":
            value = getLocName(game, "nameshort_");
            break;
        case "publish":
            value = getLocName(game, "publish_");
            break;
        default:
            value = game[key];
    }

	return formatters[type](value);
}

function sortPlain(a, b) {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

function sortTitleId(a, b) {
	// Sorts a Nintendo Switch title id
	var tida = (a >> 7) & 0x1FFFFFF;
	var tidb = (b >> 7) & 0x1FFFFFF;
	return sortPlain(tida, tidb);
}

function sortBool(a, b) {
	if (a === undefined) a = false;
	if (b === undefined) b = false;
	return a - b;
}

function compareLibOne(a, b) {
    for (var i = 0; i < a[0].length; i++) {
        if (a[0][i] < b[0][i]) return -1;
        if (a[0][i] > b[0][i]) return 1;
    }
    if (a.length != 2) return -1;
    if (b.length != 2) return 1;
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
}

function libMax(v) {
    if (!Array.isArray(v[0][0])) return v;
    var max = v[0];
    for (var i = 1; i < v.length; i++) {
        if (compareLibOne(v[i], max) > 0) max = v[i];
    }
    return max;
}

function sortLib(a, b) {
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (a.length == 0) return -1;
    if (b.length == 0) return 1;
    return compareLibOne(libMax(a), libMax(b));
}

function sortAddr(a, b) {
	// Sorts an IP address and port
	var f1 = a[0].split(".");
	var f2 = b[0].split(".");
	if (parseInt(f1[0]) < parseInt(f2[0])) return -1;
	if (parseInt(f1[0]) > parseInt(f2[0])) return 1;
	if (parseInt(f1[1]) < parseInt(f2[1])) return -1;
	if (parseInt(f1[1]) > parseInt(f2[1])) return 1;
	if (parseInt(f1[2]) < parseInt(f2[2])) return -1;
	if (parseInt(f1[2]) > parseInt(f2[2])) return 1;
	if (parseInt(f1[3]) < parseInt(f2[3])) return -1;
	if (parseInt(f1[3]) > parseInt(f2[3])) return 1;
	if (a[1] < b[1]) return -1;
	if (a[1] > b[1]) return 1;
	return 0;
}

sorters = {
	[DataType.String]: sortPlain,
	[DataType.Int]: sortPlain,
	[DataType.TitleID]: sortPlain,
	[DataType.Bool]: sortBool,
	[DataType.Version]: sortPlain,
	[DataType.Size]: sortPlain,
	[DataType.Lib]: sortLib,
	[DataType.Address]: sortAddr,
	[DataType.HexInt]: sortPlain
}

function sortFunc(a, b) {
	// Sorts two rows with the active sort index and order

	if (sortReverse) {
		var t = a;
		a = b;
		b = t;
	}
	
	var v1 = a[info.fields[sortIndex].key];
	var v2 = b[info.fields[sortIndex].key];
	
	return sorters[info.fields[sortIndex].type](v1, v2);
}
function gameMatchesName(game, query) {
	query = query.toLowerCase();

	for (var key in game) {
		if (key.startsWith("name_") || key.startsWith("nameshort_")) {
			var value = game[key];

			if (value !== undefined && value !== null &&
				String(value).toLowerCase().includes(query)) {
				return true;
			}
		}
	}

	return false;
}
function filterCheck(game) {
	for (var i = 0; i < filters.length; i++) {
		var input = filters[i];
		var filter = info.filters[i];
		if (filter.type == "checkbox" && !input.checked) {
			continue;
		}
		if (!eval(filter.filter)) {
			return false;
		}
	}
	return true;
}

function filterGames(games) {
	var filtered = [];
	for (var i = 0; i < games.length; i++) {
		var game = games[i];
		if (filterCheck(game)) {
			filtered.push(game);
		}
	}
	filtered.sort(sortFunc);
	return filtered;
}

function updateUI() {
	var table = document.getElementById("main");
	table.innerHTML = "";
	
	var head = table.insertRow(0);
	for (var i = 0; i < info.fields.length; i++) {
		if (checkboxes[i].checked) {
			var field = info.fields[i];
			var th = document.createElement("th");
			var a = document.createElement("a");
			a.index = i;
			a.innerHTML = field.name;
			if (sortIndex == a.index) {
				if (sortReverse) {
					a.innerHTML += " \\/";
				}
				else {
					a.innerHTML += " /\\";
				}
			}
			a.onclick = function() {
				if (this.index == sortIndex) {
					sortReverse = !sortReverse;
				}
				else {
					sortIndex = this.index;
					sortReverse = false;
				}
				updateUI();
			}.bind(a);
			th.appendChild(a);
			head.appendChild(th);
		}
	}
	
	var games = filterGames(info.games);
	for (var i = 0; i < games.length; i++) {
		var game = games[i];
		var row = table.insertRow(-1);
		for (var j = 0; j < info.fields.length; j++) {
			if (checkboxes[j].checked) {
				var field = info.fields[j];
				var td = document.createElement("td");
				td.innerHTML = formatField(game, field);
				row.appendChild(td);
			}
		}
	}
}

var checkboxes = [];
var categories = [];
var filters = [];

function prepareField(field) {
	var box = document.createElement("input");
	box.setAttribute("type", "checkbox");
	box.checked = field.state;
	box.onchange = updateUI;
	checkboxes.push(box);
	
	var label = document.createElement("label");
	label.appendChild(box);
	label.insertAdjacentHTML("beforeend", " " + field.name);
	
	var div = document.createElement("div");
	div.className = "checkbox";
	div.appendChild(label);
	categories[field.category].appendChild(div);
}

function prepareCategory(elem, cat) {
	var fs = document.createElement("fieldset");
	fs.setAttribute("class", "checkboxes");
	
	var legend = document.createElement("legend");
	legend.innerHTML = cat + ":";
	fs.appendChild(legend);
	
	categories.push(fs);
	
	elem.appendChild(fs);
}

function prepareFilter(elem, filter) {
	var div = document.createElement("filter");
	div.setAttribute("class", "filter");
	div.innerHTML = filter.name + ": ";
	
	var value = url.searchParams.get(filter.id);
	
	var input = document.createElement("input");
	input.setAttribute("type", filter.type);
	if (filter.type == "text") {
		input.value = value;
		input.oninput = updateUI;
	}
	else {
		if (value == "1") {
			input.checked = true;
		}
		input.onchange = updateUI;
	}
	div.appendChild(input);
	
	filters.push(input);
	
	elem.appendChild(div);
}

function prepareCategories() {
	var elem = document.getElementById("cats");
	for (var i = 0; i < info.categories.length; i++) {
		var cat = info.categories[i];
		prepareCategory(elem, cat);
	}
	for (var i = 0; i < info.fields.length; i++) {
		prepareField(info.fields[i]);
	}
}

function prepareFilters() {
	var elem = document.getElementById("filters");
	for (var i = 0; i < info.filters.length; i++) {
		var filter = info.filters[i];
		prepareFilter(elem, filter);
	}
}

function prepareParams() {
	if (sortName) {
		for (var i = 0; i < info.fields.length; i++) {
			if (info.fields[i].key == sortName) {
				sortIndex = i;
				break;
			}
		}
	}
	
	if (sortDir == "up") {
		sortReverse = false;
	}
	else if (sortDir == "down") {
		sortReverse = true;
	}
}

function prepareLang() {
	document.getElementById("lang").onchange = updateUI;
}

function prepareUI() {
	prepareCategories();
	prepareFilters();
	prepareParams();
    prepareLang();
	updateUI();
}


function download(path, callback) {
	var req = new XMLHttpRequest();
	req.overrideMimeType("application/json");
	req.onload = function() {
		callback(JSON.parse(req.responseText));
	};
	req.open("GET", path);
	req.send();
}

url = new URL(window.location.href);
sortName = url.searchParams.get("sort")
sortDir = url.searchParams.get("dir")

download("data/3ds_libs.json", function(data) {
    info = data;
    prepareUI();
});
