var parms = new URLSearchParams(window.location.search);
const IsNumeric = (num) => /^-{0,1}\d*\.{0,1}\d+$/.test(num);

// Settings
var chart;
var sExchange = (IsNumeric(parms.get("exchange"))) ? parseFloat(parms.get("exchange")) : 1;
var sWebSockets = (parms.get("webSockets") == "true") ? true : false;
var sFetch = (IsNumeric(parms.get("fetch"))) ? parseFloat(parms.get("fetch")) : 5;
var sGraph = (parms.get("graph") == "false") ? false : true;
var sGraphReset = (IsNumeric(parms.get("graphReset"))) ? parseFloat(parms.get("graphReset")) : 1;

//Exchanges
var baseURL = "https://api.binance.com/api/v3/ticker/price";
if(sExchange == 2) baseURL = "https://api.kucoin.com/api/v1/market/allTickers";
if(sExchange == 3) baseURL = "https://api.coingecko.com/api/v3";
if(sExchange == 4) baseURL = "https://api.exchange.coinbase.com";
if(sExchange == 5) baseURL = "https://api.wazirx.com/sapi/v1/tickers/24hr";
if(sExchange == 6) baseURL = "https://api.coincap.io/v2/assets?limit=2000";

// Price
var lastTotal = 0;
var total = 0;

const stableCoins = ["USDT", "BUSD"];
var names = null;
var ids = "";

function isCrypto(text){
	if(typeof(text) == 'undefined') return false;
	if(!text.match(/^[A-Za-z]+$/)) return false;
	if(!(text.length >= 3 && text.length <= 6)) return false;
	return true;
}

let cryptos = Object.keys(localStorage).filter(isCrypto).sort();

//Assets IDs
async function getCoinCapAssetsIds(){
	const response = await fetch("https://api.coincap.io/v2/assets?limit=2000");
	const json = await response.json();

	let temp = [];
	ids="";
	for(let i = 0; i < json.data.length; i++){
		if(cryptos.includes(json.data[i].symbol)){
			temp[json.data[i].symbol] = json.data[i].id;
			ids += json.data[i].id + ",";
		}
	}
	ids = ids.slice(0, -1);

	return temp;
}

// Prices
var jsonPrices = fetchPrices();
var lastPrices = new Map();
var prices = new Map();

if(!sWebSockets){
	window.setInterval(function() {
		fetchPrices();
	}, sFetch * 1000);
}

if(sGraph){
	window.setInterval(function() {
		resetChart();
	}, sGraphReset * 86400000);
}

if(sWebSockets) startWebSocket();

function startWebSocket(){

	if(sExchange == 6){

		getCoinCapAssetsIds().then(value => {
			const socket = new WebSocket('wss://ws.coincap.io/prices?assets=' + ids);

			socket.addEventListener('open', function (event) {
				console.log("WebSocket oppened at " + new Date().toLocaleString());
			});
		
			socket.addEventListener('close', function (event) {
				console.log("WebSocket closed at " + new Date().toLocaleString());
			});

			socket.addEventListener('message', function (event) {
				let data = JSON.parse(event.data);

				for(let i = 0; i < Object.keys(data).length; i++){
					cryptos.forEach(crypto => {
						if(value[crypto] == Object.keys(data)[i]){
							lastPrices.set(crypto, prices.get(crypto));
							prices.set(crypto, data[Object.keys(data)[i]]);
							updateAssets();
						}
					});
				}
			});
		});

	}else if(sExchange == 2){
		let connectId = Math.random().toString(36).slice(2);
		fetch("https://api.kucoin.com/api/v1/bullet-public", { method: 'POST' })
		.then(response => {
			if (response.ok) return response.json();
		}).then(json => {
			let token = json.data.token;
			let pingInterval = json.data.instanceServers[0].pingInterval;
			let endpoint = json.data.instanceServers[0].endpoint;

			let pairs = "";
			cryptos.forEach(crypto => {
				pairs += crypto + "-" + stableCoins[0] + ",";
			});
			pairs = pairs.slice(0, -1);

			const socket = new WebSocket(endpoint + '?token=' + token + '&connectId=' + connectId);

			socket.addEventListener('open', function (event) {
				console.log("WebSocket oppened at " + new Date().toLocaleString());
				socket.send('{ "id": "' + connectId + '","type": "subscribe","topic": "/market/ticker:' + pairs + '","response": true }');
				window.setInterval(function() {
					socket.send('{"id":"' + connectId + '","type":"ping"}');
				}, pingInterval);
				window.setInterval(function() {
					updateAssets();
				}, 1000);
			});
		
			socket.addEventListener('close', function (event) {
				console.log("WebSocket closed at " + new Date().toLocaleString());
			});

			socket.addEventListener('message', function (event) {
				let data = JSON.parse(event.data);
				if(data.subject == "trade.ticker"){
					let crypto = data.topic.replace("/market/ticker:", "").replace("-USDT", "");
					let price = data.data.price;
					
					lastPrices.set(crypto, prices.get(crypto));
					prices.set(crypto, price);
				}
			});
		}).catch();
	}else{
		let stream = (sFetch == 1) ? "!markPrice@arr@1s" : "!markPrice@arr";
		const socket = new WebSocket('wss://fstream.binance.com/ws/' + stream);

		socket.addEventListener('open', function (event) {
			console.log("WebSocket oppened at " + new Date().toLocaleString());
		});
	
		socket.addEventListener('close', function (event) {
			console.log("WebSocket closed at " + new Date().toLocaleString());
			startWebSocket();
		});
		
		socket.addEventListener('message', function (event) {
			jsonPrices = JSON.parse(event.data);
			cryptos.forEach(crypto => {
				for(let i = 0; i < stableCoins.length; i++){
					if(webSocketGetPrice(jsonPrices, crypto, stableCoins[i])) break;
					lastPrices.set(crypto, 0);
					prices.set(crypto, 0);
				}
			});
			updateAssets();
		});
	}
}

function webSocketGetPrice(jsonPrices, crypto, fiat){
	for(let i = 0; i < jsonPrices.length; i++){
		let symbol = crypto + fiat;
		let symbol2 = jsonPrices[i].s;
		if(symbol != symbol2){
			if(i == (jsonPrices.length-1)) return false;
		}else{
			lastPrices.set(crypto, prices.get(crypto));
			prices.set(crypto, jsonPrices[i].p);
			return true;
		}
	}
}

function fetchPrices(){

	if(sExchange == 4){
		for(let i = 0; i < cryptos.length; i++){
			fetch(baseURL + "/products/" + cryptos[i] + "-USD/ticker").then(response => {
				if (response.ok) return response.json();
				lastPrices.set(cryptos[i], 0);
				prices.set(cryptos[i], 0);
			}).then(json => {
				if(typeof(json.price) != 'undefined'){
					lastPrices.set(cryptos[i], prices.get(cryptos[i]));
					prices.set(cryptos[i], json.price);
				}else{
					lastPrices.set(cryptos[i], 0);
					prices.set(cryptos[i], 0);
				}
			}).catch(err => {
				lastPrices.set(cryptos[i], 0);
				prices.set(cryptos[i], 0);
			}).finally(() => {
				if(i == cryptos.length-1) updateAssets();
			});
		}
		return;
	}

	if(sExchange == 3){
		if(names == null){
			fetch(baseURL+"/coins/list?include_platform=false").then(response => {
				if (response.ok) return response.json();
			}).then(json => {
				names = {};
				for(let i = 0; i < json.length; i++){
					if(cryptos.includes(json[i].symbol.toUpperCase())){
						if(typeof(names[json[i].symbol.toUpperCase()]) == 'undefined') names[json[i].symbol.toUpperCase()] = []; 
						names[json[i].symbol.toUpperCase()].push(json[i].id);
					}
				}

				cryptos.forEach(crypto => {
					if(typeof(names[crypto]) != 'undefined'){
						// Get the shortest string from the array
						names[crypto] = names[crypto].reduce(function(a, b) {
							return a.length <= b.length ? a : b;
						});

						ids += names[crypto] + ",";
					}
				});
				ids = ids.slice(0, -1);

				fetch(baseURL+"/simple/price?ids=" + ids + "&vs_currencies=usd").then(response => {
					if (response.ok) return response.json();
				}).then(json => {
					cryptos.forEach(crypto => {
						if(typeof(names[crypto]) != 'undefined'){
							lastPrices.set(crypto, prices.get(crypto));
							prices.set(crypto, json[names[crypto]].usd);
						}else{
							lastPrices.set(crypto, 0);
							prices.set(crypto, 0);
						}
					});
					updateAssets();
				}).catch();
			}).catch();
		}else{
			fetch(baseURL+"/simple/price?ids=" + ids + "&vs_currencies=usd", {cache: "no-store"}).then(response => {
				if (response.ok) return response.json();
			}).then(json => {
				cryptos.forEach(crypto => {
					if(typeof(names[crypto]) != 'undefined'){
						lastPrices.set(crypto, prices.get(crypto));
						prices.set(crypto, json[names[crypto]].usd);
					}else{
						lastPrices.set(crypto, 0);
						prices.set(crypto, 0);
					}
				});
				updateAssets();
			}).catch();
		}
		return;
	}

	fetch(baseURL).then(response => {
		if (response.ok) return response.json();
	}).then(json => {
		jsonPrices = json;
		getPrices();
	}).catch();
}

function getPrices(){
	if(sExchange == 6){
		cryptos.forEach(crypto => {
			if(!getCoinCapPrice(crypto)){
				lastPrices.set(crypto, 0);
				prices.set(crypto, 0);
			}
		});
	}else if(sExchange == 5){
		cryptos.forEach(crypto => {
			if(!getWazirxPrice(crypto, stableCoins[0])){
				lastPrices.set(crypto, 0);
				prices.set(crypto, 0);
			}
		});
	}else if(sExchange == 2){
		cryptos.forEach(crypto => {
			if(!getKuCoinPrice(crypto, stableCoins[0])){
				lastPrices.set(crypto, 0);
				prices.set(crypto, 0);
			}
		});
	}else{
		cryptos.forEach(crypto => {
			for(let i = 0; i < stableCoins.length; i++){
				if(getPrice(crypto, stableCoins[i])) break;
				lastPrices.set(crypto, 0);
				prices.set(crypto, 0);
			}
		});
	}
	updateAssets();
}

function getPrice(crypto, fiat){
	for(let i = 0; i < jsonPrices.length; i++){
		let symbol = crypto + fiat; 
		let symbol2 = jsonPrices[i].symbol;
		if(symbol != symbol2){
			if(i == (jsonPrices.length-1)) return false;
		}else{
			lastPrices.set(crypto, prices.get(crypto));
			prices.set(crypto, jsonPrices[i].price);
			return true;
		}
	}
}

function getKuCoinPrice(crypto, fiat){
	for(let i = 0; i < jsonPrices.data.ticker.length; i++){
		let symbol = crypto + "-" + fiat;
		let symbol2 = jsonPrices.data.ticker[i].symbol;
		if(symbol != symbol2){
			if(i == (jsonPrices.data.ticker.length-1)) return false;
		}else{
			lastPrices.set(crypto, prices.get(crypto));
			prices.set(crypto, jsonPrices.data.ticker[i].last);
			return true;
		}
	}
}

function getWazirxPrice(crypto, fiat){
	for(let i = 0; i < jsonPrices.length; i++){
		let symbol = crypto.toLowerCase() + fiat.toLowerCase();
		let symbol2 = jsonPrices[i].symbol;
		if(symbol != symbol2){
			if(i == (jsonPrices.length-1)) return false;
		}else{
			lastPrices.set(crypto, prices.get(crypto));
			prices.set(crypto, jsonPrices[i].lastPrice);
			return true;
		}
	}
}

function getCoinCapPrice(crypto){
	for(let i = 0; i < jsonPrices.data.length; i++){
		let symbol2 = jsonPrices.data[i].symbol;
		if(crypto != symbol2){
			if(i == (jsonPrices.data.length-1)) return false;
		}else{
			lastPrices.set(crypto, prices.get(crypto));
			prices.set(crypto, jsonPrices.data[i].priceUsd);
			return true;
		}
	}
}

let html = "";
cryptos.forEach(crypto => {
	html += "<div class='relative bg-gray-700 pt-5 px-4 pb-5 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden'> <dt><div class='absolute p-2'><img class='h-10 w-10 rounded-full' src='images/cryptos/" + crypto + ".png' /></div><p class='ml-16 text-sm font-medium text-gray-400 truncate'>" + crypto + "</p> </dt> <dd class='ml-16 flex items-baseline'> <p class='flex items-baseline text-2xl font-semibold text-red-600'>$0.00</p><p class='ml-2 text-sm font-semibold text-gray-300'>" + localStorage.getItem(crypto) + "</p> </dd></div>";
});
document.getElementById("crypto-assets").innerHTML = html;

function updateAssets(){
	let html = "";
	lastTotal = total;
	total = 0;
	cryptos.forEach(crypto => {
		let amount = localStorage.getItem(crypto);
		let price = prices.get(crypto) * amount;
		let p = parseFloat(prices.get(crypto));
		if(p >= 1) p = p.toFixed(2);
		else if(p >= 0.01) p = p.toFixed(4);
		else if(p >= 0.0001) p = p.toFixed(6);
		else if(p >= 0.000001) p = p.toFixed(8);
		total += price;
		if(lastPrices.get(crypto) <= prices.get(crypto)){
			html += "<div class='relative bg-gray-700 pt-5 px-4 pb-5 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden'> <dt><div class='absolute p-2'><img class='h-10 w-10 rounded-full' src='images/cryptos/" + crypto + ".png' /></div><p class='ml-16 text-sm font-medium text-gray-400 truncate'>" + crypto + " <span class='text-green-400'>$" + p + "</span>" + "</p></dt><dd class='ml-16 flex items-baseline'><p class='flex items-baseline text-2xl font-semibold text-green-600'>$" + price.toFixed(2) + "</p><p class='ml-2 text-sm font-semibold text-gray-300'>" + amount + "</p> </dd></div>";
		}else{
			html += "<div class='relative bg-gray-700 pt-5 px-4 pb-5 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden'> <dt><div class='absolute p-2'><img class='h-10 w-10 rounded-full' src='images/cryptos/" + crypto + ".png' /></div><p class='ml-16 text-sm font-medium text-gray-400 truncate'>" + crypto + " <span class='text-red-400'>$" + p + "</span>" + "</p></dt><dd class='ml-16 flex items-baseline'><p class='flex items-baseline text-2xl font-semibold text-red-600'>$" + price.toFixed(2) + "</p><p class='ml-2 text-sm font-semibold text-gray-300'>" + amount + "</p> </dd></div>";
		}
	});
	if(lastTotal <= total){
		document.getElementById("total").className = "text-2xl font-semibold text-green-600";
	}else{
		document.getElementById("total").className = "text-2xl font-semibold text-red-600";
	}
	document.getElementById("crypto-assets").innerHTML = html;
	document.getElementById("total").innerText = "$" + total.toFixed(2);
	if(sGraph) updateChart();
}

Chart.defaults.color = "#c6cbd2";

var chartData = {
	type: "line",
	data: {
		labels: [],
		datasets: [
			{
				label: "Total Assets",
				backgroundColor: "#00ff00",
				borderColor: "#1e894b",
				data: [],
				normalized: true
			},
		]
	},
	options: {
		spanGaps: true,
		elements: {
			point:{
				radius: 0,
				hitRadius: 10,
				hoverRadius: 5
			}
		},
		plugins: {
			decimation: {
				enabled: true,
				algorithm: "lttb"
			}
		}
	}
};

if(!sGraph) document.getElementById("graph").innerHTML = "";
if(sGraph) chart = new Chart(document.getElementById("chart"), chartData);

function updateChart(){
	let date = new Date();
	chartData.data.labels.push(String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0"));
	chartData.data.datasets[0].data.push(total);
	chart.update();
}

function resetChart(){
	if(!sGraph) return;
	chartData.data.labels = [];
	chartData.data.datasets[0].data = [];
	chart.update();
}