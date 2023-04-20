let timerInterval;
let mainWeb3 = null;
let address = null;
let env = 'prod'; // local, prod
let endpoint = ((env === 'local') ? "http://ownly-api.test" : "https://ownly.market")
let explorer = ((env === 'local') ? "https://mumbai.polygonscan.com/" : "https://mumbai.polygonscan.com/")

let incrementMoves = function() {
    moves++;
    $("#moves").html(moves);
};
let startTimer = function() {
    let startTime = new Date().getTime();

    if(timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(function() {
        let now = new Date().getTime();
        let distance = now - startTime;

        let time = formatTime(distance);

        $("#time").html(time);
    }, 500);
};
let formatTime = function(seconds) {
    let days = padZeroes(Math.floor(seconds / (1000 * 60 * 60 * 24)));
    let hours = padZeroes(Math.floor((seconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    let minutes = padZeroes(Math.floor((seconds % (1000 * 60 * 60)) / (1000 * 60)));
    let _seconds = padZeroes(Math.floor((seconds % (1000 * 60)) / 1000));

    let time = "";
    time = (days !== "00") ? time + days + ":" : "";
    time = (hours !== "00") ? time + hours + ":" : "";
    time = time + minutes + ":" + _seconds;

    return time;
};
let processWin = function() {
    clearInterval(timerInterval);

    let now = new Date().getTime();
    let distance = now - startTime;

    let time = formatTime(distance);

    $("#final-time").html(time);
    $("#total-moves").html(moves);

    $("#modal-win").modal("show");

    let duration = (distance / 1000).toFixed(0);

    getSignature(duration, moves);
};
let getSignature = function(duration, moves) {
    $("#cancel-registration-on-blockchain").addClass("d-none");

    let registerOnBlockchain = $("#modal-win .register-on-blockchain");

    registerOnBlockchain.prop("disabled", true);
    registerOnBlockchain.html("Finalizing Data");

    let formData = new FormData();
    formData.append('player', address)
    formData.append('duration', duration)
    formData.append('moves', moves)

    $.ajax({
        url: endpoint + "/api/solitaire/getSignature",
        method: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: formData
    }).done(function(response) {
        $("#cancel-registration-on-blockchain").removeClass("d-none");
        registerOnBlockchain.prop("disabled", false);
        registerOnBlockchain.html("Register on Blockchain");

        registerOnBlockchain.attr("data-id", response.solitaireResult.id);
        registerOnBlockchain.attr("data-duration", response.solitaireResult.duration);
        registerOnBlockchain.attr("data-moves", response.solitaireResult.moves);
        registerOnBlockchain.attr("data-signature", response.solitaireResult.signature);

        getRecords();
    }).fail(function(error) {
        getSignature(duration, moves);
    });
};
let shortenAddress = function(address, prefixCount, postfixCount) {
    let prefix = address.substring(0, prefixCount);
    let postfix = address.substring(address.length - postfixCount, address.length);

    return prefix + "..." + postfix;
}
let getConnectedAddress = async function() {
    if(!address) {
        try {
            let accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            address = (accounts.length > 0) ? accounts[0] : false;

            if(address) {
                $("#connect-wallet-container").addClass("d-none");
                $("#connected-wallet-container").removeClass("d-none");

                $("#wallet-image").attr("src", "https://api.dicebear.com/6.x/bottts/svg?seed=" + address + "&backgroundColor=" + address.substring(2, 8) + "&scale=80");
                $("#connected-address").html(shortenAddress(address, 5, 4));

                getRecords();
            }

            ethereum.on('accountsChanged', async function(_chainId) {
                accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                address = (accounts.length > 0) ? accounts[0] : false;

                $("#wallet-image").attr("src", "https://api.dicebear.com/6.x/bottts/svg?seed=" + address + "&backgroundColor=" + address.substring(2, 8) + "&scale=80");
                $("#connected-address").html(shortenAddress(address, 5, 4));

                getRecords();
            });
        } catch(e) {}
    }
};
let getRecords = function() {
    $("#records-table").html('<div class="text-center p-4"><div class="spinner-grow mb-3" role="status" style="width:50px; height:50px"><span class="visually-hidden">Loading...</span></div><p class="mb-0">Loading</p></div>');

    $.ajax({
        url: endpoint + "/api/solitaire/getRecords/" + address,
        method: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: []
    }).done(function(response) {
        let content = ' <table class="table table-bordered mb-0">';
        content += '        <tr>';
        content += '            <th class="text-center align-middle">Date&nbsp;& Time</th>';
        content += '            <th class="text-center align-middle">Duration</th>';
        content += '            <th class="text-center align-middle">Moves</th>';
        content += '            <th></th>';
        content += '        </tr>';
        for(let i = 0; i < response.records.length; i++) {
            content += '    <tr>';
            content += '        <td class="text-center align-middle">' + response.records[i].date + '</td>';
            content += '        <td class="text-center align-middle">' + formatTime(response.records[i].duration * 1000) + '</td>';
            content += '        <td class="text-center align-middle">' + response.records[i].moves + '</td>';
            content += '        <td class="text-center align-middle">';
            if(response.records[i].transaction_hash) {
                content += '        <a href="' + explorer + 'tx/' + response.records[i].transaction_hash + '" target="_blank" rel="noreferrer" class="btn btn-custom-1 btn-sm line-height-110 font-size-90 px-3 w-100" style="padding-top:12px; padding-bottom:12px">Transaction Hash</a>';
            } else {
                content += '        <button class="btn btn-custom-1 btn-sm line-height-110 font-size-90 px-3 w-100 register-on-blockchain" data-id="' + response.records[i].id + '" data-duration="' + response.records[i].duration + '" data-moves="' + response.records[i].moves + '" data-signature="' + response.records[i].signature + '">Register on Blockchain</button>';
            }
            content += '        </td>';
            content += '    </tr>';
        }
        content += '    </table>';

        $("#records-table").html(content);
    }).fail(function(error) {
        getRecords();
    });
};
let updateRecord = function(id, transactionHash) {
    $("#records-table").html('<div class="text-center p-4"><div class="spinner-grow mb-3" role="status" style="width:50px; height:50px"><span class="visually-hidden">Loading...</span></div><p class="mb-0">Loading</p></div>');

    let formData = new FormData();
    formData.append('id', id);
    formData.append('transactionHash', transactionHash);

    $.ajax({
        url: endpoint + "/api/solitaire/updateRecord",
        method: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: formData
    }).done(function(response) {
        getLeaderboards();
        getRecords();
    }).fail(function(error) {
        updateRecord(id, transactionHash);
    });
};
let getLeaderboards = function() {
    $("#leaderboards-table").html('<div class="text-center p-4"><div class="spinner-grow mb-3" role="status" style="width:50px; height:50px"><span class="visually-hidden">Loading...</span></div><p class="mb-0">Loading</p></div>');

    $.ajax({
        url: endpoint + "/api/solitaire/getLeaderboards",
        method: "POST",
        cache: false,
        contentType: false,
        processData: false,
        data: []
    }).done(function(response) {
        let content = ' <table class="table table-bordered font-size-90 mb-0">';
        content += '        <tr>';
        content += '            <th class="text-center align-middle">Rank</th>';
        content += '            <th class="text-center align-middle">Player</th>';
        content += '            <th class="text-center align-middle">Moves</th>';
        content += '            <th class="text-center align-middle">Duration</th>';
        content += '            <th class="text-center align-middle">Score</th>';
        content += '            <th class="text-center align-middle">Transaction</th>';
        content += '        </tr>';
        for(let i = 0; i < response.records.length; i++) {
            content += '    <tr>';
            content += '        <td class="text-center align-middle">' + (i + 1) + '</td>';
            content += '        <td class="text-center align-middle">' + shortenAddress(response.records[i].player, 5, 4) + '</td>';
            content += '        <td class="text-center align-middle">' + response.records[i].moves + '</td>';
            content += '        <td class="text-center align-middle">' + formatTime(response.records[i].duration * 1000) + '</td>';
            content += '        <td class="text-center align-middle">' + response.records[i].score + '</td>';
            content += '        <td class="text-center align-middle">';
            content += '            <a href="' + explorer + 'tx/' + response.records[i].transaction_hash + '" target="_blank" rel="noreferrer" class="btn btn-custom-1 btn-sm line-height-110 font-size-80 px-3 w-100">Transaction Hash</a>';
            content += '        </td>';
            content += '    </tr>';
        }
        content += '    </table>';

        $("#leaderboards-table").html(content);
    }).fail(function(error) {
        getLeaderboards();
    });
};
let connectWallet = async function() {
    if(!mainWeb3) {
        try {
            await getConnectedAddress();

            mainWeb3 = new Web3(ethereum);

            return true;
        } catch (error) {
            $("#modal-no-metamask-installed").modal("show");
            return false;
        }
    } else {
        return true;
    }
};
let checkNetwork = async function(chainId) {
    if(await connectWallet()) {
        let connectedChainId = await mainWeb3.eth.getChainId();

        if(connectedChainId === chainId) {
            return true;
        } else {
            return await switchNetwork(chainId);
        }
    }

    return false;
};
let switchNetwork = async function(chainId) {
    try {
        let chainIdInHex = "0x" + chainId.toString(16);

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdInHex}],
        });

        return true;
    } catch (switchError) {
        // The network has not been added to MetaMask
        if (switchError.code === 4902) {
            return await addNetwork(chainId);
        } else {
            return false;
        }
    }
};
let addNetwork = async function(chainId) {
    try {
        let data;

        if(chainId === 56) {
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName:'BNB Chain',
                rpcUrls:['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls:['https://bscscan.com/'],
                nativeCurrency: {
                    symbol:'BNB',
                    decimals: 18
                }
            }
        } else if(chainId === 97) {
            console.log('0x' + chainId.toString(16));
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName:'BNB Chain Testnet',
                rpcUrls:['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                blockExplorerUrls:['https://testnet.bscscan.com/'],
                nativeCurrency: {
                    symbol:'BNB',
                    decimals: 18
                }
            }
        } else if(chainId === 137) {
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName:'Polygon',
                rpcUrls:['https://polygon-rpc.com'],
                blockExplorerUrls:['https://polygonscan.com/'],
                nativeCurrency: {
                    symbol:'MATIC',
                    decimals: 18
                }
            }
        } else if(chainId === 80001) {
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName:'Polygon Mumbai',
                rpcUrls:['https://matic-mumbai.chainstacklabs.com'],
                blockExplorerUrls:['https://mumbai.polygonscan.com/'],
                nativeCurrency: {
                    symbol:'MATIC',
                    decimals: 18
                }
            }
        } else if(chainId === 1) {
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName: 'Ethereum Mainnet',
                rpcUrls: ['https://mainnet.infura.io/v3/'],
                blockExplorerUrls: ['https://etherscan.io'],
                nativeCurrency: {
                    symbol: 'ETH',
                    decimals: 18
                }
            }
        } else if(chainId === 4) {
            data = {
                chainId: '0x' + chainId.toString(16),
                chainName:'Rinkeby Test Network',
                rpcUrls:['https://rinkeby.infura.io/v3/'],
                blockExplorerUrls:['https://rinkeby.etherscan.io'],
                nativeCurrency: {
                    symbol:'ETH',
                    decimals: 18
                }
            }
        }

        let networkIsAdded = await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [data]
        });

        return !!(networkIsAdded);
    } catch (err) {
        console.log(err);
        return false;
    }
};
let padZeroes = (number) => {
    number = number.toString();

    while(number.length < 2) {
        number = "0" + number;
    }

    return number;
};

$(document).ready(async function() {
    getLeaderboards();
    await getConnectedAddress();
});

$(document).on("click", "#new-game", function() {
    $("#time").html("00:00");
    moves = -1;
    incrementMoves();
    end = false;
    newGame(3);
});

$(document).on("click", ".update-deck", function() {
    let deck = $(this).attr("data-deck");

    let decks = ['deck-1'];
    let suites = ['heart', 'club', 'diamond', 'spade'];
    let numbers = ['ace', 'jack', 'queen', 'king'];

    // clear deck first
    for(let k = 0; k < decks.length; k++) {
        for(let i = 0; i < suites.length; i++) {
            for(let j = 0; j < numbers.length; j++) {
                $("." + suites[i] + ".card" + numbers[j]).removeClass(decks[k]);
            }
        }

        $(".cardback").removeClass(decks[k]);
    }

    if(deck) {
        for(let i = 0; i < suites.length; i++) {
            for(let j = 0; j < numbers.length; j++) {
                $("." + suites[i] + ".card" + numbers[j]).addClass(deck);
            }
        }

        $(".cardback").addClass(deck);
    }

    $(".update-deck .fa-solid").addClass("invisible");
    $(".update-deck[data-deck='" + deck + "'] .fa-solid").removeClass("invisible");
});

$(document).on("click", "#connect-wallet", async function() {
    await connectWallet();
});

$(document).on("click", ".register-on-blockchain", async function() {
    let id = $(this).attr("data-id");
    let duration = $(this).attr("data-duration");
    let moves = $(this).attr("data-moves");
    let signature = $(this).attr("data-signature");

    let chainId = 80001;
    let contractAddress = "0xf65A51907E03cC68F542E4013e809AA49CFCFDD1";
    let contractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"player","type":"address"},{"indexed":true,"internalType":"uint256","name":"index","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"moves","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"duration","type":"uint256"}],"name":"RecordAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[{"internalType":"uint256","name":"moves","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"addRecord","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_messageHash","type":"bytes32"}],"name":"getEthSignedMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"moves","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"}],"name":"getMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"}],"name":"getPlayerTotalRecords","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getRecord","outputs":[{"components":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"moves","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"}],"internalType":"struct Solitaire.Record","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalRecords","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getValidator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_ethSignedMessageHash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_validator","type":"address"}],"name":"setValidator","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"sig","type":"bytes"}],"name":"splitSignature","outputs":[{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"},{"internalType":"uint8","name":"v","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"moves","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"}];

    let button = $(this);
    $(".register-on-blockchain").prop("disabled", true);
    button.html("Opening<br>Wallet");

    if(!await checkNetwork(parseInt(chainId))) {
        return false;
    }

    let contract = new mainWeb3.eth.Contract(contractAbi, contractAddress);

    contract.methods.addRecord(moves, duration, signature).send({
        from: mainWeb3.utils.toChecksumAddress(address)
    }).on('transactionHash', function(transactionHash){
        $("#modal-my-records").modal("hide");
        $("#modal-win").modal("hide");

        $(".register-on-blockchain").prop("disabled", false);
        button.html("Register on Blockchain");

        $("#modal-processing").modal("show");
        $("#modal-success .message").html("You have successfully registered your record on the blockchain.<br><a href='" + explorer + "/tx/" + transactionHash + "' target='_blank' rel='noreferrer' class='text-color-1'>Transaction Hash</a>");
    }).on('error', function(error){
        $("#modal-processing").modal("hide");

        $(".register-on-blockchain").prop("disabled", false);
        button.html("Register on Blockchain");

        $("#modal-error .message").text(error.code + ": " + error.message);
        $("#modal-error").modal("show");
    }).then(function(receipt) {
        $("#modal-processing").modal("hide");

        $("#modal-success").modal("show");

        updateRecord(id, receipt.transactionHash);
        // getRecords();
    });
});

// ################################################################################################################
// ################################################################################################################

/// Script Variables
var precursorX; // Recent x coordinates of cursor
var precursorY; // Recent y coordinates of cursor
var cursorX; // Latest x coordinates of cursor
var cursorY; // Latest y coordinates of cursor
var cardbasetopcss;
var cardbaseleftcss = {};
var dealbasetopcss;
var dealbaseleftcss = {};
var pilebasetopcss;
var pilebaseleftcss;
var spacing;
var cardwidth;
var cardlength;
var currentClassElements = ""; // Class of currently selected element for dragging
var elements = []; // All the elements to drag
var threeMode;
var moves = 0;

/// User Values
cardbasetopcss = 200;
cardbaseleftcss["cardplaybase1"] = 80;
cardbaseleftcss["cardplaybase2"] = 190;
cardbaseleftcss["cardplaybase3"] = 300;
cardbaseleftcss["cardplaybase4"] = 410;
cardbaseleftcss["cardplaybase5"] = 520;
cardbaseleftcss["cardplaybase6"] = 630;
cardbaseleftcss["cardplaybase7"] = 740;
dealbasetopcss = 40;
dealbaseleftcss["dealbase1"] = 410;
dealbaseleftcss["dealbase2"] = 520;
dealbaseleftcss["dealbase3"] = 630;
dealbaseleftcss["dealbase4"] = 740;
pilebasetopcss = 40;
pilebaseleftcss = 240;
spacing = 23;
cardwidth = 79;
cardlength = 110;

/// Fix for annoying select-cursor bug in Chrome
document.onselectstart = function(e) {
    e.preventDefault();
    return false;
}

/// Organize cards for initial load and refresh
function orderPlayBase(num){
    var className = ".cardplaybase" + num;
    var length = $(className).length;
    var initialtop = $(className).css("top");
    for(var x = 0 ; x < length ; x++ ){
        var newtop = parseInt(initialtop) + ( spacing * x );
        if(x > 0)$(className).eq(x).css("top", newtop+"px");
        $(className).eq(x).css("z-index", x + 1);
    }
}

/// Organize deck cards for initial load and refresh
function orderDeckBase(){
    var className = ".cardpilebase";
    var length = $(className).length;
    var initialleft = pilebaseleftcss;
    var orderDeckBaseCounter = 0;
    for(var x = 0 ; x < length ; x++ ){
        if(orderDeckBaseCounter == 0){
            var newleft = initialleft;
            $(className).eq(x).css("left", newleft+"px");
            $(className).eq(x).css("z-index", x+2);
            if(threeMode) orderDeckBaseCounter++;
        }
        else if(orderDeckBaseCounter == 1){
            var newleft = initialleft - ( spacing * 1 );
            $(className).eq(x).css("left", newleft+"px");
            $(className).eq(x).css("z-index", x);
            if(threeMode) orderDeckBaseCounter++;
        }
        else if(orderDeckBaseCounter == 2){
            var newleft = initialleft - ( spacing * 2 );
            $(className).eq(x).css("left", newleft+"px");
            $(className).eq(x).css("z-index", x-2);
            if(threeMode) orderDeckBaseCounter = 0;
        }

        if($(".cardpilebase").eq(x).hasClass("pile3")){
            $(".cardpilebase").eq(x).removeClass("pile3");
        }
        if($(".cardpilebase").eq(x).hasClass("pile2")){
            $(".cardpilebase").eq(x).removeClass("pile2");
        }
        if($(".cardpilebase").eq(x).hasClass("pile1")){
            $(".cardpilebase").eq(x).removeClass("pile1");
        }
    }
}

/// First randomize all dealbase cards;
function loadDeckCards(){
    var className = ".cardpilebase";
    var length = $(className).length;
    for(var x = 0 ; x < length ; x++ ){
        $(className).eq(x).addClass(randomCards());
    }
}

var suits = new Array(4);
var suitsName = [];
function randomCards(){
    var returnstring = "";

    var suitsMin=0;
    var suitsMax=suits.length - 1;
    var result1 = Math.floor(Math.random() * (+suitsMax - +suitsMin)) + +suitsMin;
    returnstring = returnstring + suitsName[result1];


    var cardsuitsMin=0;
    var cardsuitsMax=suits[result1].length - 1;
    var result2 = Math.floor(Math.random() * (+cardsuitsMax - +cardsuitsMin)) + +cardsuitsMin;
    returnstring = returnstring + " " + suits[result1][result2];
    if(suits[result1].length == 1){
        suits.splice(result1,1);
        suitsName.splice(result1,1);
    }
    else{
        suits[result1].splice(result2,1);
    }

    return returnstring;
}

/// Dragging Cards function
function mousedown(mouseClick = true){
    if(elements.length != 0){
        for(var x = 0 ; x < elements.length && mouseClick ; x++ ){
            elements[x].css("z-index" , parseInt(elements[x].css("z-index")) - 100 );
        }
        elements = [];
        currentClassElements = "";
    }

    var elementFromPoint = document.elementFromPoint(cursorX, cursorY);
    var eClassName = elementFromPoint.className;
    var eZIndex = parseInt(document.elementFromPoint(cursorX, cursorY).style.zIndex);

    if(eClassName.includes("cardplaybase")){
        var className = eClassName.substr(eClassName.indexOf("cardplaybase"),13);

        if($(elementFromPoint).hasClass("draggable")){
            currentClassElements = className;
            elements.push($(elementFromPoint));
            for(var x = 0 ; x < $("."+className).length ; x++){
                if( $("."+className).eq(x).css("z-index") > eZIndex ){
                    elements.push($("."+className).eq(x));
                }
            }

            for(var x = 0 ; x < elements.length && mouseClick ; x++ ){
                elements[x].css("z-index" , parseInt(elements[x].css("z-index")) + 100 );
            }

            for(var x = 0 ; x < elements.length ; x++ ){
                for(var y = 0 ; y < elements.length-1 ; y++ ){
                    if( parseInt(elements[y].css("z-index")) > parseInt(elements[y+1].css("z-index")) ){
                        var temp = elements[y];
                        elements[y] = elements[y+1];
                        elements[y+1] = temp;
                    }
                }
            }
        }
    }
    else if(eClassName.includes("dealbase")){
        var className = eClassName.substr(eClassName.indexOf("dealbase"),9);

        if($(elementFromPoint).hasClass("draggable")){
            currentClassElements = className;
            elements.push($(elementFromPoint));
        }

        for(var x = 0 ; x < elements.length && mouseClick ; x++ ){
            elements[x].css("z-index" , parseInt(elements[x].css("z-index")) + 100 );
        }
    }
    else if(eClassName.includes("cardpilebase")){
        if($(elementFromPoint).hasClass("draggable")){
            currentClassElements = "cardpilebase";
            elements.push($(elementFromPoint));
        }

        for(var x = 0 ; x < elements.length && mouseClick ; x++ ){
            elements[x].css("z-index" , parseInt(elements[x].css("z-index")) + 100 );
        }
    }
}

var dragPaused = false;
function drag(e){
    if(!dragPaused){
        precursorX = cursorX;
        precursorY = cursorY;
        cursorX = event.clientX;
        cursorY = event.clientY;
        if(elements.length > 0){
            clickCount = 0;
        }

        for(var x = 0 ; x < elements.length ; x++ ){
            var temp = parseInt(elements[x].css("top"));
            elements[x].css("top",(temp + (cursorY-precursorY)).toString() + "px");
            temp = parseInt(elements[x].css("left"));
            elements[x].css("left",(temp + (cursorX-precursorX)).toString() + "px");
        }
    }
}

function touchdrag(e){
    precursorX = cursorX;
    precursorY = cursorY;
    cursorX = parseInt(event.touches[0].clientX);
    cursorY = parseInt(event.touches[0].clientY);

    for(var x = 0 ; x < elements.length ; x++ ){
        var temp = parseInt(elements[x].css("top"));
        elements[x].css("top",(temp + (cursorY-precursorY)).toString() + "px");
        temp = parseInt(elements[x].css("left"));
        elements[x].css("left",(temp + (cursorX-precursorX)).toString() + "px");
    }
}

function mouseup(mouseClick = true){
    for(var x = 0 ; x < elements.length && mouseClick ; x++ ){
        elements[x].css("z-index" , parseInt(elements[x].css("z-index")) - 100 );
    }

    if(currentClassElements.includes("cardplaybase") || currentClassElements.includes("dealbase") || currentClassElements.includes("cardpilebase") || !mouseClick){
        var cliptrue = false;

        // If card was drag to cardbase
        for (const [key, value] of Object.entries(cardbaseleftcss)) {
            if( (( cursorX >= value && cursorX <= value + cardwidth && cursorY >= cardbasetopcss) ||
                    (elements[0].position().left >= value && elements[0].position().left <= value + cardwidth && elements[0].position().top >= cardbasetopcss) ||
                    (elements[0].position().left + cardwidth >= value && elements[0].position().left + cardwidth <= value + cardwidth && elements[0].position().top >= cardbasetopcss) )
                && key != currentClassElements && clipToCardBase(key,elements[0]) ){
                cliptrue = true;
                incrementMoves();
                var toClassNameLength = $("."+key).length;
                for(var x = 0 ; x < elements.length ; x++ ){
                    elements[x].removeClass(currentClassElements).addClass(key);
                    elements[x].css("top",cardbasetopcss + (spacing * (toClassNameLength+x)));
                    elements[x].css("z-index",toClassNameLength+x+1);
                    elements[x].css('left',"");
                    if(currentClassElements == "cardpilebase"){
                        if(elements[x].hasClass("pile3")){
                            elements[x].removeClass("pile3");
                        }
                        if(elements[x].hasClass("pile2")){
                            elements[x].removeClass("pile2");
                        }
                        if(elements[x].hasClass("pile1")){
                            elements[x].removeClass("pile1");
                        }
                    }
                }

                // If card was from the cardpile
                if(currentClassElements == "cardpilebase"){
                    for( var y = $(".cardpilebase").length - 1 ; y >= 0 ; y-- ){
                        if(!$(".cardpilebase").eq(y).hasClass("cardpilehidden")){
                            if($(".cardpilebase").eq(y).hasClass("pile1")){
                                if($(".cardpilebase").eq(y-1).hasClass("pile2") && $(".cardpilebase").eq(y-2).hasClass("pile3")){
                                    $(".cardpilebase").eq(y-2).addClass("draggable");
                                    break;
                                }
                                else if($(".cardpilebase").eq(y-1).hasClass("pile2")){
                                    $(".cardpilebase").eq(y-1).addClass("draggable");
                                    break;
                                }
                                else{
                                    $(".cardpilebase").eq(y).addClass("draggable");
                                    break;
                                }
                            }
                            else{
                                $(".cardpilebase").eq(y).addClass("draggable");
                                break;
                            }
                        }
                    }
                    drawPileCounter--;
                }

                break;
            }
        }

        // If Card was drag to dealbase
        if(elements.length == 1){
            for (const [key, value] of Object.entries(dealbaseleftcss)) {
                if( ((cursorX >= value && cursorX <= value + cardwidth && cursorY >= dealbasetopcss && cursorY <= dealbasetopcss + cardlength) ||
                        (elements[0].position().left >= value && elements[0].position().left <= value + cardwidth && elements[0].position().top >= dealbasetopcss && elements[0].position().top <= dealbasetopcss + cardlength) ||
                        (elements[0].position().left >= value && elements[0].position().left <= value + cardwidth && elements[0].position().top + cardlength >= dealbasetopcss && elements[0].position().top + cardlength <= dealbasetopcss + cardlength) ||
                        (elements[0].position().left + cardwidth >= value && elements[0].position().left + cardwidth <= value + cardwidth && elements[0].position().top + cardlength >= dealbasetopcss && elements[0].position().top + cardlength <= dealbasetopcss + cardlength) ||
                        (elements[0].position().left + cardwidth >= value && elements[0].position().left + cardwidth <= value + cardwidth && elements[0].position().top >= dealbasetopcss && elements[0].position().top <= dealbasetopcss + cardlength) )
                    && clipToDealBase(key,elements[0]) ){
                    cliptrue = true;
                    incrementMoves();
                    var toClassNameLength = $("."+key).length;
                    for(var x = 0 ; x < elements.length ; x++ ){
                        elements[x].removeClass(currentClassElements).addClass(key);
                        elements[x].css("top",cardbasetopcss);
                        elements[x].css("z-index",toClassNameLength+x+1);
                        elements[x].css('left',"");
                        elements[x].css('top',"");
                        if(currentClassElements == "cardpilebase"){
                            if(elements[x].hasClass("pile3")){
                                elements[x].removeClass("pile3");
                            }
                            if(elements[x].hasClass("pile2")){
                                elements[x].removeClass("pile2");
                            }
                            if(elements[x].hasClass("pile1")){
                                elements[x].removeClass("pile1");
                            }
                        }
                    }

                    // If card was from the cardpile
                    if(currentClassElements == "cardpilebase"){
                        for( var y = $(".cardpilebase").length - 1 ; y >= 0 ; y-- ){
                            if(!$(".cardpilebase").eq(y).hasClass("cardpilehidden")){
                                if($(".cardpilebase").eq(y).hasClass("pile1")){
                                    if($(".cardpilebase").eq(y-1).hasClass("pile2") && $(".cardpilebase").eq(y-2).hasClass("pile3")){
                                        $(".cardpilebase").eq(y-2).addClass("draggable");
                                        break;
                                    }
                                    else if($(".cardpilebase").eq(y-1).hasClass("pile2")){
                                        $(".cardpilebase").eq(y-1).addClass("draggable");
                                        break;
                                    }
                                    else{
                                        $(".cardpilebase").eq(y).addClass("draggable");
                                        break;
                                    }
                                }
                                else{
                                    $(".cardpilebase").eq(y).addClass("draggable");
                                    break;
                                }
                            }
                        }
                        drawPileCounter--;
                    }

                    break;
                }
            }
        }

        // If Card was drag to illegal places
        if(!cliptrue && currentClassElements.includes("cardplaybase")){
            for(var x = 0 ; x < elements.length ; x++ ){
                elements[x].css('left',"");
                elements[x].css('top', (cardbasetopcss + spacing * (elements[x].css("z-index")-1)) + "px");
            }
        }
        else if(!cliptrue && currentClassElements.includes("dealbase")){
            for(var x = 0 ; x < elements.length ; x++ ){
                elements[x].css('left',"");
                elements[x].css('top', dealbasetopcss + "px");
            }
        }
        else if(!cliptrue && currentClassElements.includes("cardpilebase")){
            for(var x = 0 ; x < elements.length ; x++ ){
                if ( elements[x].attr('class').includes("pile3") ){
                    elements[x].css('left', pilebaseleftcss + "px");
                }
                else if ( elements[x].attr('class').includes("pile2") ){
                    var newleft = pilebaseleftcss - ( spacing * 1 );
                    elements[x].css('left', newleft + "px");
                }
                else if ( elements[x].attr('class').includes("pile1") ){
                    var newleft = pilebaseleftcss - ( spacing * 2 );
                    elements[x].css('left', newleft + "px");
                }
                elements[x].css('top', pilebasetopcss + "px");
            }
        }
    }

    elements = [];
    openTopCard();
    setDraggable();
    ifWin();
    if(mouseClick && (currentClassElements.includes("cardpilebase") || currentClassElements.includes("cardplaybase")) && !currentClassElements.includes("cardpilebasebg")) clicks();
    currentClassElements = "";
}

var suitCards = ["cardace","card2","card3","card4","card5","card6","card7","card8","card9","card10","cardjack","cardqueen","cardking"];
function clipToCardBase(cardbase,element){
    if(element == undefined) return false;

    var cardbaseElement;
    var cardbasesuitcolor;
    var cardbasesuitcard;

    var elementsuit;
    var elementsuitcard;

    if( $("."+cardbase).length == 0 && element.hasClass("cardking") ){
        return true;
    }
    else if( $("."+cardbase).length == 0 && !element.hasClass("cardking") ){
        return false;
    }

    for(var x = 0 ; x < $("."+cardbase).length ; x++ ){
        if( $("."+cardbase).eq(x).css("z-index") == ($("."+cardbase).length)){
            cardbaseElement = $("."+cardbase).eq(x);
            break;
        }
    }

    if( cardbaseElement.hasClass("spade") || cardbaseElement.hasClass("club") ){
        cardbasesuitcolor = "black";
    }
    else{
        cardbasesuitcolor = "red";
    }

    for( var x = 0 ; x < suitCards.length ; x++ ){
        if( cardbaseElement.hasClass(suitCards[x]) ){
            cardbasesuitcard = x;
            break;
        }
    }

    if( element.hasClass("spade") || element.hasClass("club") ){
        elementsuit = "black";
    }
    else{
        elementsuit = "red";
    }

    for( var x = 0 ; x < suitCards.length ; x++ ){
        if( element.hasClass(suitCards[x]) ){
            elementsuitcard = x;
            break;
        }
    }

    if( cardbasesuitcolor != elementsuit && cardbasesuitcard - 1 == elementsuitcard ) return true;
    else {
        return false;
    }
}

function clipToDealBase(dealbase,element){
    if(element == undefined) return false;

    var dealbasesuitElement;
    var dealbasesuit;
    var dealbasesuitcard;

    var elementsuit;
    var elementsuitcard;

    if( $("."+dealbase).length == 0 && element.hasClass("cardace") ){
        return true;
    }
    else if( $("."+dealbase).length == 0 && !element.hasClass("cardace") ){
        return false;
    }

    for(var x = 0 ; x < $("."+dealbase).length ; x++ ){
        if( $("."+dealbase).eq(x).css("z-index") == ($("."+dealbase).length)){
            dealbasesuitElement = $("."+dealbase).eq(x);
            break;
        }
    }

    if( dealbasesuitElement.hasClass("spade") ){
        dealbasesuit = "spade";
    }
    else if( dealbasesuitElement.hasClass("diamond") ){
        dealbasesuit = "diamond";
    }
    else if( dealbasesuitElement.hasClass("club") ){
        dealbasesuit = "club";
    }
    else if( dealbasesuitElement.hasClass("heart") ){
        dealbasesuit = "heart";
    }

    for( var x = 0 ; x < suitCards.length ; x++ ){
        if( dealbasesuitElement.hasClass(suitCards[x]) ){
            dealbasesuitcard = x;
            break;
        }
    }

    if( element.hasClass("spade") ){
        elementsuit = "spade";
    }
    else if( element.hasClass("diamond") ){
        elementsuit = "diamond";
    }
    else if( element.hasClass("club") ){
        elementsuit = "club";
    }
    else if( element.hasClass("heart") ){
        elementsuit = "heart";
    }

    for( var x = 0 ; x < suitCards.length ; x++ ){
        if( element.hasClass(suitCards[x]) ){
            elementsuitcard = x;
            break;
        }
    }

    if( dealbasesuit == elementsuit && dealbasesuitcard + 1 == elementsuitcard ) return true;
    else{
        return false;
    }
}

/// Update cards that are draggable to draggable status
/// Update this function for the specific gametype
function setDraggable(){
    var length = $(".cards").length;
    for(var x = 0 ; x < length ; x++){
        if(!$(".cards").eq(x).hasClass("cardback") && !$(".cards").eq(x).hasClass("cardpilebase")){
            $(".cards").eq(x).addClass("draggable");
        }
    }
}


/// Update pile of cards to flip the top back facing cards
function openTopCard(){
    for(var x = 1 ; x <= 7 ; x++ ){
        var length = $(".cardplaybase"+x).length;
        if($(".cardplaybase"+x).eq(length-1).hasClass("cardback")){
            var cardClass = randomCards();
            $(".cardplaybase"+x).eq(length-1).addClass(cardClass).removeClass("cardback");
        }
    }
}


var drawPileCounter = 0;
/// Open 3 cards from file
function drawPile(){
    var openedCounter = 0;
    var cardPileBaseLength = $(".cardpilebase").length;
    if( cardPileBaseLength <= drawPileCounter ){
        for ( var x = 0 ; x < cardPileBaseLength ; x++ ){
            if(!$(".cardpilebase").eq(x).hasClass("cardpilehidden")){
                $(".cardpilebase").eq(x).addClass("cardpilehidden");
            }
            if($(".cardpilebase").eq(x).hasClass("draggable")){
                $(".cardpilebase").eq(x).removeClass("draggable");
            }
        }
        drawPileCounter = 0;
    }
    else{
        for ( var x = 0 ; x < cardPileBaseLength ; x++ ){
            var drawPileAmount = 2;
            if(!threeMode) drawPileAmount = 0;
            if( x <= drawPileCounter + drawPileAmount ){
                if($(".cardpilebase").eq(x).hasClass("cardpilehidden")){
                    $(".cardpilebase").eq(x).removeClass("cardpilehidden");
                }
                if($(".cardpilebase").eq(x).hasClass("draggable")){
                    $(".cardpilebase").eq(x).removeClass("draggable");
                }
                if(threeMode){
                    if(x == drawPileCounter){
                        if(!$(".cardpilebase").eq(x).hasClass("pile3")){
                            $(".cardpilebase").eq(x).addClass("pile3");
                        }
                        if(!$(".cardpilebase").eq(x).hasClass("draggable")){
                            $(".cardpilebase").eq(x).addClass("draggable");
                        }
                        openedCounter++;
                    }
                    else if(x == drawPileCounter+1){
                        if(!$(".cardpilebase").eq(x).hasClass("pile2")){
                            $(".cardpilebase").eq(x).addClass("pile2");
                        }
                        openedCounter++;
                    }
                    else if(x == drawPileCounter+2){
                        if(!$(".cardpilebase").eq(x).hasClass("pile1")){
                            $(".cardpilebase").eq(x).addClass("pile1");
                        }
                        openedCounter++;
                    }
                }
                else{
                    if(x == drawPileCounter){
                        if(!$(".cardpilebase").eq(x).hasClass("pile3")){
                            $(".cardpilebase").eq(x).addClass("pile3");
                        }
                        if(!$(".cardpilebase").eq(x).hasClass("draggable")){
                            $(".cardpilebase").eq(x).addClass("draggable");
                        }
                        openedCounter++;
                    }
                }
            }
            else{
                if(!$(".cardpilebase").eq(x).hasClass("cardpilehidden")){
                    $(".cardpilebase").eq(x).addClass("cardpilehidden");
                }
                if($(".cardpilebase").eq(x).hasClass("draggable")){
                    $(".cardpilebase").eq(x).removeClass("draggable");
                }
            }
        }
    }

    drawPileCounter += openedCounter;
    if( cardPileBaseLength <= drawPileCounter ){
        if($(".cardpilebasebg").hasClass("cardback")){
            $(".cardpilebasebg").removeClass("cardback");
        }
    }
    else{
        if(!$(".cardpilebasebg").hasClass("cardback")){
            $(".cardpilebasebg").addClass("cardback");
        }
        if(drawPileCounter == 0 ) orderDeckBase();
    }
}

// newGame() 1 turn mode: default
// newGame(3) 3 turn mode
// newGame(1) 1 turn mode
function newGame(mode = 3) {
    startTimer();

    if( mode == 3 ){
        threeMode = true;
    }
    else if( mode == 1 ){
        threeMode = false;
    }
    else{
        threeMode = false;
    }
    precursorX = undefined;
    precursorY = undefined;
    cursorX = undefined;
    cursorY = undefined;
    currentClassElements = "";
    elements = [];

    suits[0] = ["cardace","card2","card3","card4","card5","card6","card7","card8","card9","card10","cardjack","cardqueen","cardking"];
    suits[1] = ["cardace","card2","card3","card4","card5","card6","card7","card8","card9","card10","cardjack","cardqueen","cardking"];
    suits[2] = ["cardace","card2","card3","card4","card5","card6","card7","card8","card9","card10","cardjack","cardqueen","cardking"];
    suits[3] = ["cardace","card2","card3","card4","card5","card6","card7","card8","card9","card10","cardjack","cardqueen","cardking"];
    suitsName = ["spade","diamond","club","heart"];

    var initialGameArea = "";

    initialGameArea = initialGameArea + '<div class="cardpilebasebg cardback" onclick="drawPile()"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardpilebase cardpilehidden"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase1 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase2 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase2 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase3 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase3 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase3 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase4 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase4 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase4 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase4 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase5 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase5 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase5 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase5 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase5 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase6 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="cards cardplaybase7 cardback"></div>';
    initialGameArea = initialGameArea + '<div class="dealbase1bg"></div>';
    initialGameArea = initialGameArea + '<div class="dealbase2bg"></div>';
    initialGameArea = initialGameArea + '<div class="dealbase3bg"></div>';
    initialGameArea = initialGameArea + '<div class="dealbase4bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase1bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase2bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase3bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase4bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase5bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase6bg"></div>';
    initialGameArea = initialGameArea + '<div class="cardplaybase7bg"></div>';

    $(".gamearea").html(initialGameArea);

    orderPlayBase(1);
    orderPlayBase(2);
    orderPlayBase(3);
    orderPlayBase(4);
    orderPlayBase(5);
    orderPlayBase(6);
    orderPlayBase(7);

    openTopCard();
    orderDeckBase();
    setDraggable();
    loadDeckCards();
}

var startTime = Date.now();
var moveX = 9;
var moveY = 15;
var moveYAdd = 0;
var altermoveYAdd = 0;
var direction = 1;
var tick = 0;
var end = false;
var bounceStr = 0.75;

var currentDealBase = 1;
var currentEQ = 0;
var currentZIndex = 13;
function win(){
    if( Date.now() - startTime >= tick ){

        startTime = Date.now();

        if( moveYAdd <= 0 && direction < 0 ){
            if(direction < 0) direction = direction * -1;
        }
        else if( $(".dealbase" + currentDealBase).eq(currentEQ).position().top + cardlength >= window.innerHeight && direction > 0 ){
            if(direction > 0) direction = direction * -1;
            moveYAdd *= bounceStr;
        }

        if(direction < 0){
            moveYAdd -= 2;
        }
        else if(direction > 0){
            if( window.innerHeight < ($(".dealbase" + currentDealBase).eq(currentEQ).position().top + cardlength + moveYAdd) ){
                altermoveYAdd = window.innerHeight - ($(".dealbase" + currentDealBase).eq(currentEQ).position().top + cardlength);
            }
            else{
                moveYAdd += 2;
                altermoveYAdd = 0;
            }
        }

        if(direction > 0 && altermoveYAdd == 0) $(".dealbase" + currentDealBase).eq(currentEQ).css('top', ( $(".dealbase" + currentDealBase).eq(currentEQ).position().top + moveYAdd) + "px");
        else if(direction > 0 && altermoveYAdd != 0){
            $(".dealbase" + currentDealBase).eq(currentEQ).css('top', ( $(".dealbase" + currentDealBase).eq(currentEQ).position().top + altermoveYAdd) + "px");
            if(direction > 0) direction = direction * -1;
            moveYAdd *= bounceStr;
        }
        else if(direction < 0) $(".dealbase" + currentDealBase).eq(currentEQ).css('top', ( $(".dealbase" + currentDealBase).eq(currentEQ).position().top - moveYAdd) + "px");

        $(".dealbase" + currentDealBase).eq(currentEQ).css('left', ( $(".dealbase" + currentDealBase).eq(currentEQ).position().left + moveX) + "px");

        if( $(".dealbase" + currentDealBase).eq(currentEQ).position().left + cardwidth < 0 || $(".dealbase" + currentDealBase).eq(currentEQ).position().left > window.innerWidth ){
            if(currentDealBase == 4 && currentZIndex == 1){
                end = true;
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
                deleteTrail();
            }
            else if(currentDealBase < 4 && currentZIndex >= 1){
                currentDealBase++;
                for(var x = 0 ; x < 13 ; x++ ){
                    if($(".dealbase"+currentDealBase).eq(x).css("z-index") == currentZIndex){
                        currentEQ = x;
                        break;
                    }
                }
                moveX = randomNumber(-15,15);
                moveY = randomNumber(-30,30);
                moveYAdd = moveX;
                direction = 1;
            }
            else if(currentDealBase == 4 && currentZIndex >= 1){
                currentDealBase = 1;
                currentZIndex--;
                for(var x = 0 ; x < 13 ; x++ ){
                    if($(".dealbase"+currentDealBase).eq(x).css("z-index") == currentZIndex){
                        currentEQ = x;
                        break;
                    }
                }
                moveX = randomNumber(-15,15);
                moveY = randomNumber(-30,30);
                moveYAdd = moveX;
                direction = 1;
            }
        }

        trail(".dealbase" + currentDealBase,currentEQ);
    }

    if(!end)window.requestAnimationFrame(win);

}

var currentZIndexTrail = 100;
function trail(dealbase,eq){
    var className = $(dealbase).eq(eq).attr("class");
    var newClassName = "trail cards";
    for (var x = 0 ; x < suitCards.length ; x++ ){
        if(className.includes(suitCards[x])){
            newClassName = newClassName + " " + suitCards[x];
        }
    }

    if(className.includes("spade")){
        newClassName = newClassName + " spade";
    }
    else if(className.includes("diamond")){
        newClassName = newClassName + " diamond";
    }
    else if(className.includes("club")){
        newClassName = newClassName + " club";
    }
    else if(className.includes("heart")){
        newClassName = newClassName + " heart";
    }

    $(".gamearea").append("<div class=\"" + newClassName + "\" style=\"top: "+$(dealbase).eq(eq).position().top+"px; left: "+$(dealbase).eq(eq).position().left+"px; z-index: "+(currentZIndexTrail++)+";\"></div>");

    deleteTrail();
}

var maxTrail = 10;
function deleteTrail(){
    if(currentZIndexTrail - 100 > maxTrail){
        $(".trail").eq(0).remove();
    }
}

function ifWin(){
    var dealbase1Number = $(".dealbase1").length;
    var dealbase2Number = $(".dealbase2").length;
    var dealbase3Number = $(".dealbase3").length;
    var dealbase4Number = $(".dealbase4").length;

    if( dealbase1Number == 13 && dealbase2Number == 13 && dealbase3Number == 13 && dealbase4Number == 13 ){
        processWin();

        for(var x = 0 ; x < 13 ; x++ ){
            if($(".dealbase1").eq(x).css("z-index") == currentZIndex){
                currentEQ = x;
                break;
            }
        }
        window.requestAnimationFrame(win);
    }
}

function randomNumber(min,max){
    if(min < -5 && max > 5){
        var returnVal = 0;
        while (returnVal < 5 && returnVal > -5){
            returnVal = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return returnVal;
    }
    else{
        if( Math.floor(Math.random() * (1 - 0 + 1)) + 0 == 1 ) return 5;
        else return -5;
    }
}

var clickTime = Date.now();
var clickCount = 0;
var timeout = 500;
var timeoutVar;
function clicks() {
    if (clickCount == 1) {
        if(Date.now() - clickTime <= 500){
            doubleClick();
            clickCount = 0;
            clearTimeout(timeoutVar);
        }
        else{
            timeoutVar = setTimeout(function(){
                clickCount = 0;
            }, timeout);
            clickCount++;
            clickTime = Date.now();
        }
    }
    else{
        timeoutVar = setTimeout(function(){
            clickCount = 0;
        }, timeout);
        clickCount++;
        clickTime = Date.now();
    }
}

function doubleClick(){
    dragPaused = true;
    mousedown(false);

    if(elements.length > 0){
        var tempcursorX = cursorX;
        var tempcursorY = cursorY;

        if(elements[0].attr("class").includes("cardace")){
            if($(".dealbase1").length == 0){
                cursorX = dealbaseleftcss["dealbase1"];
                cursorY = dealbasetopcss;
            }
            else if($(".dealbase2").length == 0){
                cursorX = dealbaseleftcss["dealbase2"];
                cursorY = dealbasetopcss;
            }
            else if($(".dealbase3").length == 0){
                cursorX = dealbaseleftcss["dealbase3"];
                cursorY = dealbasetopcss;
            }
            else if($(".dealbase4").length == 0){
                cursorX = dealbaseleftcss["dealbase4"];
                cursorY = dealbasetopcss;
            }
        }
        else if(elements.length == 1){
            if(clipToDealBase("dealbase1",elements[0])){
                cursorX = dealbaseleftcss["dealbase1"];
                cursorY = dealbasetopcss;
            }
            else if(clipToDealBase("dealbase2",elements[0])){
                cursorX = dealbaseleftcss["dealbase2"];
                cursorY = dealbasetopcss;
            }
            else if(clipToDealBase("dealbase3",elements[0])){
                cursorX = dealbaseleftcss["dealbase3"];
                cursorY = dealbasetopcss;
            }
            else if(clipToDealBase("dealbase4",elements[0])){
                cursorX = dealbaseleftcss["dealbase4"];
                cursorY = dealbasetopcss;
            }
            else if(clipToCardBase("cardplaybase1",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase1"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase2",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase2"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase3",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase3"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase4",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase4"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase5",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase5"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase6",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase6"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase7",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase7"];
                cursorY = cardbasetopcss;
            }
        }
        else{
            if(clipToCardBase("cardplaybase1",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase1"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase2",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase2"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase3",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase3"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase4",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase4"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase5",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase5"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase6",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase6"];
                cursorY = cardbasetopcss;
            }
            else if(clipToCardBase("cardplaybase7",elements[0])){
                cursorX = cardbaseleftcss["cardplaybase7"];
                cursorY = cardbasetopcss;
            }
        }

        mouseup(false);
        cursorX = tempcursorX;
        cursorY = tempcursorY;
    }

    dragPaused = false;
}

/// On document ready call
$(function(){
    document.onmousedown = function() {
        mousedown();
    };

    document.ontouchstart = function() {
        precursorX = parseInt(event.touches[0].clientX);
        precursorY = parseInt(event.touches[0].clientY);
        cursorX = parseInt(event.touches[0].clientX);
        cursorY = parseInt(event.touches[0].clientY);
        mousedown();
    };

    document.onmouseup = function() {
        mouseup();
    };

    document.ontouchend = function() {
        mouseup();
    };

    document.onmousemove = function(e) {
        drag(e);
    };

    document.ontouchmove = function(e) {
        touchdrag(e);
    };

    newGame(3);
});