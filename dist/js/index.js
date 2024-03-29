updateTable();

function isCrypto(text){
	if(typeof(text) == 'undefined') return false;
	if(!text.match(/^[A-Za-z]+$/)) return false;
	if(!(text.length >= 3 && text.length <= 6)) return false;
	return true;
}

document.getElementById("start-btn").addEventListener('click', () => {
	let url = "monitor.html";
	url += "?exchange=" + document.getElementById("fetch-exchange").value;
	url += "&webSockets=" + document.getElementById("webSockets-btn").ariaChecked;
	url += "&fetch=" + document.getElementById("fetch-time").value;
	url += "&graph=" + document.getElementById("graph-btn").ariaChecked;
	url += "&graphReset=" + document.getElementById("graph-reset").value;

	window.location = url;
});

document.getElementById("fetch-exchange").addEventListener('change', () => {
	calculateSettings();
});

document.getElementById("webSockets-btn").addEventListener('click', () => {
	toggleSwitch("webSockets");
	calculateSettings();
});

document.getElementById("graph-btn").addEventListener('click', () => {
	toggleSwitch("graph");
	calculateSettings();
});

document.getElementById("add-btn").addEventListener('click', () => {
	let crypto = document.getElementById("crypto").value;
	let amount = document.getElementById("amount").value;

	document.getElementById("crypto").value = "";
	document.getElementById("amount").value = "";

	if(typeof(crypto) == 'undefined') return;
	if(!crypto.match(/^[A-Za-z]+$/)) return;
	if(!(crypto.length >= 3 && crypto.length <= 6)) return;

	if(typeof(amount) == 'undefined') return;
	if(!IsNumeric(amount)) return;

	localStorage.setItem(crypto.toUpperCase(), amount);
	updateTable();
});

function calculateSettings(){

	//CoinCap
	if(document.getElementById("fetch-exchange").value == 6){
		if(getSwitchState("webSockets")){
			document.getElementById("fetch-time").innerHTML = "<option value='0' selected>Real-time</option>";
		}else{
			document.getElementById("fetch-time").innerHTML = "<option value='1'>1 second</option><option value='2'>2 seconds</option><option value='3'>3 seconds</option><option value='4'>4 seconds</option><option value='5'>5 seconds</option><option value='6'>6 seconds</option><option value='7'>7 seconds</option><option value='8'>8 seconds</option><option value='9'>9 seconds</option><option value='10'>10 seconds</option><option value='15' selected>15 seconds</option><option value='20'>20 seconds</option><option value='30'>30 seconds</option><option value='45'>45 seconds</option><option value='60'>60 seconds</option>";
		}
		return;
	}

	//Wazirx
	if(document.getElementById("fetch-exchange").value == 5){
		if(getSwitchState("webSockets")) toggleSwitch("webSockets");
		document.getElementById("fetch-time").innerHTML = "<option value='60' selected>1 minute</option><option value='120'>2 minutes</option><option value='180'>3 minutes</option><option value='240'>4 minutes</option><option value='300'>5 minutes</option><option value='600'>10 minutes</option>";
		return;
	}

	//Coinbase
	if(document.getElementById("fetch-exchange").value == 4){
		if(getSwitchState("webSockets")) toggleSwitch("webSockets");
		document.getElementById("fetch-time").innerHTML = "<option value='1'>1 second</option><option value='2'>2 seconds</option><option value='3' selected>3 seconds</option><option value='4'>4 seconds</option><option value='5'>5 seconds</option><option value='6'>6 seconds</option><option value='7'>7 seconds</option><option value='8'>8 seconds</option><option value='9'>9 seconds</option><option value='10'>10 seconds</option><option value='15'>15 seconds</option><option value='20'>20 seconds</option><option value='30'>30 seconds</option><option value='45'>45 seconds</option><option value='60'>60 seconds</option>";
		return;
	}

	//CoinGecko
	if(document.getElementById("fetch-exchange").value == 3){
		if(getSwitchState("webSockets")) toggleSwitch("webSockets");
		document.getElementById("fetch-time").innerHTML = "<option value='60' selected>1 minute</option><option value='120' selected>2 minutes</option><option value='180'>3 minutes</option><option value='240'>4 minutes</option><option value='300'>5 minutes</option><option value='600'>10 minutes</option>";
		return;
	}

	//KuCoin
	if(document.getElementById("fetch-exchange").value == 2){
		if(getSwitchState("webSockets")){
			document.getElementById("fetch-time").innerHTML = "<option value='0' selected>Real-time</option>";
		}else{
			document.getElementById("fetch-time").innerHTML = "<option value='1'>1 second</option><option value='2'>2 seconds</option><option value='3'>3 seconds</option><option value='4'>4 seconds</option><option value='5' selected>5 seconds</option><option value='6'>6 seconds</option><option value='7'>7 seconds</option><option value='8'>8 seconds</option><option value='9'>9 seconds</option><option value='10'>10 seconds</option><option value='15'>15 seconds</option><option value='20'>20 seconds</option><option value='30'>30 seconds</option><option value='45'>45 seconds</option><option value='60'>60 seconds</option>";
		}
		return;
	}

	//Binance
	if(getSwitchState("webSockets")){
		document.getElementById("fetch-time").innerHTML = "<option value='1'>1 second</option><option value='3' selected>3 seconds</option>";
	}else{
		document.getElementById("fetch-time").innerHTML = "<option value='1'>1 second</option><option value='2'>2 seconds</option><option value='3' selected>3 seconds</option><option value='4'>4 seconds</option><option value='5'>5 seconds</option><option value='6'>6 seconds</option><option value='7'>7 seconds</option><option value='8'>8 seconds</option><option value='9'>9 seconds</option><option value='10'>10 seconds</option><option value='15'>15 seconds</option><option value='20'>20 seconds</option><option value='30'>30 seconds</option><option value='45'>45 seconds</option><option value='60'>60 seconds</option>";
	}
}

function updateTable(){
	let cryptos = Object.keys(localStorage).filter(isCrypto).sort();
	let html = "";
	cryptos.forEach(crypto => {
		html += "<tr><td class='px-4 py-4 whitespace-nowrap'><div class='flex items-center'><div class='flex-shrink-0 h-10 w-10'><img class='h-10 w-10 rounded-full' src='images/cryptos/" + crypto + ".png'></div></div></td><td class='px-4 py-4 whitespace-nowrap text-sm text-gray-400'>" + crypto + "</td><td class='px-4 py-4 whitespace-nowrap text-sm text-gray-400'>" + localStorage.getItem(crypto) + "</td><td class='px-4 py-4 whitespace-nowrap text-left'><button id='remove-" + crypto + "' type='button' class='inline-flex items-center px-3 py-2 border border-gray-600 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-400 bg-gray-700 hover:bg-gray-600 focus:outline-none'>Remove</button></td></tr>";
	});
	document.getElementById("cryptos").innerHTML = html;

	cryptos.forEach(crypto => {
		document.getElementById("remove-" + crypto).addEventListener('click', () => {
			localStorage.removeItem(crypto);
			updateTable();
		});
	});
}