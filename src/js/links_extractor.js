(function() {

    var appId = chrome.runtime.id;

    function log() {
        console.log.apply(console, arguments);
    }

    function error() {
        console.error.apply(console, arguments);
    }

    function getKey(key, cb) {
        chrome.extension.sendMessage({
            method: "getLocalStorage",
            key: key
        }, cb);
    }

    function isWhitelisted(uri, cb) {
        chrome.extension.sendMessage({
            method: "isWhitelisted",
            uri: uri
        }, cb);
    }

    // Re matched against <from>, where email is <from>@domain.com
    var skipFromRe = [
        /support/i,
        /reply/i, // + notreply, no-reply, noreply
        /team/i,
        /news/i,
        /info/i,
        /digest/i,
        /update/i,
        /admin/i,
        /support/i,
        /notification/i,
        /hello/i,
        /offers/i,
        /help/i
    ];

    // Re matched against a.href before fetching data, e.g. http://domain.com/unsubscribe
    var skipHrefRe = [
        /subscribe/i, // + unsubscribe
        /subscription/i,
        /activate/i,
        /restore/i,
        /reset/i,
        /contact/i,
        /support/i,
        /form/i,
        /login/i,
        /opt_out/i,        
        /about/i,
        /verify/i,
        /key/i,
        /faq/i,
        /help/i,
        /^mailto:/i,
        /^tel:/i,
        /linkedin/i,
        /google/i,
        /^https?:\/\/[^\/]+\/?$/i
    ];

    var urlRe = /https?:\/\/[^ "]+/ig;

    function skippedHref(uri) {
        for(var i = 0; i < skipHrefRe.length; i++) {
            if (uri.match(skipHrefRe[i])) {
                return true;
            }
        }
        return false;
    }

    function skippedFromEmail(email) {
        var from = email.split('@');
        from = from[0];
        for(var i = 0; i < skipFromRe.length; i++) {
            if (from.match(skipFromRe[i])) {
                return true;
            }
        }
        return false;
    }

    $.iframely.defaults.endpoint = "//iframe.ly/api/iframely";

    function loadLink(link) {

        isWhitelisted(link.uri, function(whitelisted) {

            if (!whitelisted) {
                return;
            }

            $.iframely.getPageData(link.uri, {
                api_key: '416cc19fe9a30033731f9fd97b2e1f66',
                from: 'gmail',
                url: true
            }, function(e, data) {

                if (e) {
                    error("iframely error on", link.uri, e, data);
                    return;
                }

                var image, player;

                var links = [];
                for(var key in data.links) {
                    links = links.concat(data.links[key]);
                }
                data.links = links;

                // Find big image.
                var images = $.iframely.filterLinksByRel("image", data.links, {httpsOnly: true});
                if (images.length == 0) {
                    images = $.iframely.filterLinksByRel("image", data.links);
                }

                var $window = $(window);
                var image = $.iframely.findBestFittedLink($window.width(), $window.width(), images);

                // Find player or survey or reader.
                var player = $.iframely.filterLinksByRel(["player", "survey", "reader"], data.links, {httpsFirst: true, returnOne: true});

                if (!image && !player) {
                    // Skip non interesting link.
                    return;
                }

                link.$el.click(function(e) {
                    e.preventDefault();

                    alert(JSON.stringify(image || player));
                });
            });
        });
    }

    function runLinkParsing() {

        // Each mail.
        $('.gs').each(function() {
            var $mail = $(this);

            var $from = $mail.find('.gD');

            var fromEmail = $from.attr('email');
            if (skippedFromEmail(fromEmail)) {
                return;
            }

            var links = [];

            // Each mail body.
            $mail.find('.ii.gt a').each(function() {

                var $this = $(this);

                if ($this.parents('.gmail_extra').length > 0) {
                    return;
                }

                var href = $this.attr('href');
                var text = $this.text();
                if (href !== text) {
                    return
                }

                if (skippedHref(href)) {
                    return;
                }

                if ($this.attr('data-iframely-used') == "true") {
                    return;
                }

                $this.attr('data-iframely-used', "true");

                loadLink({
                    uri: href,
                    $el: $this
                });
            });
        });
    }

    setInterval(function() {

        runLinkParsing();

    }, 1000);

})();