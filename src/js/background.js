(function() {

    function onInstall(currentVersion) {
        chrome.tabs.create({url: 'http://iframe.ly/gmail-thankyou'});
    }

    function onUpdate(currentVersion, prevVersion) {
        if (prevVersion !== "0.1.6" && prevVersion !== "0.1.7" && currentVersion === "0.1.8") {
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