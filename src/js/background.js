(function() {

    var REST_WHITELIST = 'https://iframe.ly/domains.json';

    var whitelisted;
    var whitelistedCache = {};

    var WHITELIST_TTL = 24 * 60 * 60 * 1000;
    var WHITELIST_RETRY_TIMEOUT = 10 * 1000;

    // Fetch whitelist.

    function _ajax(url, method, data, success, error){
        try {

            var data = localStorage["xhr:" + url];
            var data_at = localStorage["xhr:date:" + url];
            if (data && data_at) {
                var stored_at = parseInt(data_at);
                if ((new Date()).getTime() - stored_at < WHITELIST_TTL) {
                    console.log('return wl from cache');
                    return success(JSON.parse(data));
                }
            }

        } catch(e) {}

        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-type","application/json");
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                console.log(xhr);
                var data;
                try{
                    data = JSON.parse(xhr.responseText);
                } catch(e){}
                if (data && xhr.status === 200){

                    localStorage["xhr:" + url] = xhr.responseText;
                    localStorage["xhr:date:" + url] = (new Date()).getTime();

                    success(data);
                } else {
                    error();
                }
            }
        };
        xhr.send(data);
    }

    function fetchWhitelist() {
        _ajax(REST_WHITELIST, 'GET', undefined, function(data){
            setWhiteList(data);
        }, function() {
            setTimeout(fetchWhitelist, WHITELIST_RETRY_TIMEOUT);
        });
    }

    setTimeout(function() {
        fetchWhitelist();
        setInterval(fetchWhitelist, WHITELIST_TTL + 1000);
    }, 2000);

    // End fetch whitelist.

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
        whitelisted = [];
        data.forEach(function(re){
            whitelisted.push(new RegExp(re.s,re.m));
        });
    }

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
        chrome.tabs.create({url: 'http://iframe.ly/gmail-thankyou'});
    }

    function onUpdate(currentVersion, prevVersion) {
        if (currentVersion == "0.1.6") {
            chrome.tabs.create({url: 'http://iframe.ly/gmail-updated'});
        }
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