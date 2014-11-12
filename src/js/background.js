(function() {

    function onInstall(currentVersion) {
        chrome.tabs.create({url: 'https://iframely.com/gmail-thankyou'});
    }

    function onUpdate(currentVersion, prevVersion) {
        if (currentVersion === "0.1.9" || currentVersion === "0.1.10") {
            chrome.tabs.create({url: 'https://iframely.com/gmail-updated'});
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