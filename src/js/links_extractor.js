(function() {

    var API_ENDPOINT = '//iframely.com/gmail';

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

    $.iframely.defaults.endpoint = API_ENDPOINT;

    var linksCache = {};

    function loadLinkCached(uri, origin, cb) {

        var cache = linksCache[uri] = linksCache[uri] || {};

        if (cache.error) {
            return;
        }

        if (cache.data) {
            return cb(cache.data);
        }

        var stack = cache.stack = cache.stack || [];

        stack.push(cb);

        if (!cache.loading) {
            cache.loading = true;

            $.iframely.getPageData(uri, {
                origin: origin,
                url: true
            }, function(e, data) {

                if (e) {
                    cache.error = e;
                    error("iframely error on", uri, e, data);
                    return;
                }

                cache.data = data;

                stack.forEach(function(cb) {
                    cb(data);
                });
            });
        }
    }

    function runLinkParsing() {

        $('a').each(function() {

            var $link = $(this);

            var scanned = $link.data('iframely-scanned');
            if (typeof scanned !== 'undefined') {
                return;
            }

            $link.data('iframely-scanned', true);

            var href = $link.attr('href');
            var text = $link.text();

            if (href === text) {
                $link.after(' <a href="#" data-iframely-embed="' + href + '">' + embedButtonText + '</a>')
            }
        });
    }

    setInterval(function() {

        runLinkParsing();

    }, 1000);

    var closeButtonText = '[close]';
    var embedButtonText = '[embed]'

    $('body').on('click', 'textarea[data-iframely-close]', function() {
        var $input = $(this);
        $input.select();
    });

    $('body').on('click', 'a[data-iframely-embed]', function(e) {

        e.preventDefault();

        var $link = $(this);

        var closeId = $link.attr('close-id');

        if (closeId) {
            $('[data-iframely-close="' + closeId + '"]').remove();
            $link.removeAttr('close-id');
            $link.text(embedButtonText);

            return;
        }

        closeId = new Date().getTime();

        $link.attr('close-id', closeId);

        var href = $link.attr('data-iframely-embed');

        $link.text('Loading...');

        loadLinkCached(href, 'chromeembed', function(data) {
            $link.text(closeButtonText);
            $link.after('<br data-iframely-close="' + closeId + '"><br data-iframely-close="' + closeId + '"><textarea style="width: 400px; height: 100px;" data-iframely-close="' + closeId + '">' + data.html + '</textarea>');
        });
    });

})();