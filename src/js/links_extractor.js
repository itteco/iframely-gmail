(function() {

    function prepareUrlProtocol(url) {
        if (document.location.protocol === 'file:') {
            url = 'http:' + url;
        }
        return url;
    }

    function prepareEmbedCodeProtocol(code) {
        if (document.location.protocol === 'file:') {
            code = code.replace(/src="\/\//i, 'src="http://');
        }
        return code;

    }

    var API_ENDPOINT = prepareUrlProtocol('//iframely.com/gmail');

    function log() {
        console.log.apply(console, arguments);
    }

    function error() {
        console.error.apply(console, arguments);
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
                url: true,
                iframe: 1
            }, function(e, data) {

                if (e) {
                    cache.error = e;
                    error("iframely error on", uri, e, data);
                    return cb(e);
                }

                cache.data = data;

                stack.forEach(function(cb) {
                    cb(null, data);
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
    var embedButtonText = '[show]';

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

        loadLinkCached(href, 'chrome', function(error, data) {

            if (error || !data.html) {

                $link
                    .css('color', 'red')
                    .text('Error');

                setTimeout(function() {
                    $link.remove();
                }, 1000);

                if (data && data.meta && data.meta.title) {
                    $('a[href="' + href + '"]').each(function() {
                        var $l = $(this);
                        if ($l.text() === href) {
                            $l.text(data.meta.title);
                        }
                    });
                }

                return;
            }

            $link.text(closeButtonText);
            $link.after('<br data-iframely-close="' + closeId + '"><br data-iframely-close="' + closeId + '"><div style="width: 100%;" data-iframely-close="' + closeId + '">' + prepareEmbedCodeProtocol(data.html) + '</div>');
        });
    });

})();