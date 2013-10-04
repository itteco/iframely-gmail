(function() {

    var REST_WHITELIST = 'https://iframely.com/supported-plugins-re.json';

    var whitelisted;
    var whitelistedCache = {};

    function _ajax(url, method, data, success){
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-type","application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                var data;
                try{
                    data = JSON.parse(xhr.responseText);
                } catch(e){}
                if (data){
                    success(data);
                }
            }
        };
        xhr.send(data);
    }

    function isUrlWhitelisted(url){
        if (!whitelisted) return;
        if (typeof(whitelistedCache[url]) != 'undefined') return whitelistedCache[url];

        var isWhitelisted = whitelisted.some(function(re){
            return url.match(re);
        });
        whitelistedCache[url] = isWhitelisted;
        return isWhitelisted;
    }

    function setWhiteList(data){
        if (whitelisted) return;

        whitelisted = [];
        data.forEach(function(re){
            whitelisted.push(new RegExp(re.s,re.m));
        });
    }

    function getWhiteList(){
        _ajax(REST_WHITELIST, 'GET', undefined, function(data){
            clearInterval(retryWhitelist);
            setWhiteList(data);
        });
    }

    var retryWhitelist = setInterval(getWhiteList, 60*1000);
    getWhiteList();

    chrome.extension.onMessage.addListener(
        function(message, sender, cb) {
            if (message && message.method == "isWhitelisted") {
                cb(isUrlWhitelisted(message.uri));
            }
            if (message && message.method == "getLocalStorage") {
                cb(localStorage[message.key]);
            }
            if (message && message.method == "setLocalStorage") {
                localStorage[message.key] = message.value;
            }
        }
    );

    function onInstall(currentVersion) {
        chrome.tabs.create({url: 'http://iframely.com/gmail-thankyou'});
    }

    function onUpdate(currentVersion, prevVersion) {
    }

    // Check if the version has changed.
    var currentVersion = chrome.app.getDetails().version;
    var prevVersion = localStorage['iframely-gmail.extension.version'];
    if (currentVersion != prevVersion) {
        // Check if we just installed this extension.
        if (typeof prevVersion == 'undefined') {
            onInstall(currentVersion);
        } else {
            onUpdate(currentVersion, prevVersion);
        }
        localStorage['iframely-gmail.extension.version'] = currentVersion;
    }

})();