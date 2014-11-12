(function() {

    function prepareUrlProtocol(url) {
        if (document.location.protocol === 'file:') {
            url = 'http:' + url;
        }
        return url;
    }

    function removeUrlProtocol(url) {
        return url.replace(/https?:/gi, '');
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

        if (cache.error || cache.data) {
            return cb(cache.error, cache.data);
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

                    stack.forEach(function(cb) {
                        cb(e);
                    });

                    return;
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

            if ($link.parents('[contenteditable="true"]').length) {
                return;
            }

            var href = $link.attr('href');
            var text = $link.text();

            if (removeUrlProtocol(href) === removeUrlProtocol(text)) {
                $link.after(' <a href="#" data-iframely-embed="' + href + '">' + embedButtonText + '</a>')
            }
        });
    }

    setInterval(function() {

        runLinkParsing();

    }, 1000);

    var embedButtonText = '[show]';
    var closeButtonText = '[hide]';

    $('body').on('click', 'a[data-iframely-embed]', function(e) {

        e.preventDefault();

        // Call page's ga.
        var scr = document.createElement('script');
        scr.textContent = '(' + function () {
            if (window.ga){
                ga('send', 'pageview', {
                    'page': '/url-embed-called-by-chrome-user-via-iframely.com',
                    'title': 'Hi, your user asked Iframely for Chrome for an embed. Just saying...'
                });
            }
            if (window._gaq){
                _gaq.push(['_trackPageview', '/url-embed-called-by-chrome-user-via-iframely.com']);
            }
        } + ')();';
        $('body')[0].appendChild(scr);
        scr.parentNode.removeChild(scr);

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

                if (data && data.meta && data.meta.title) {

                    $link.remove();

                    $('a[href="' + href + '"]').each(function() {
                        var $l = $(this);
                        if ($l.text() === href) {
                            $l.text(data.meta.title);
                        }
                    });

                } else {

                    $link
                        .css('color', 'red')
                        .text('Sorry, no embeds');

                    setTimeout(function() {
                        $link.remove();
                    }, 1000);
                }

                return;
            }

            $link.text(closeButtonText);
            $link.after('<br data-iframely-close="' + closeId + '"><br data-iframely-close="' + closeId + '"><div style="width: 100%;" data-iframely-close="' + closeId + '">' + prepareEmbedCodeProtocol(data.html) + '</div><br data-iframely-close="' + closeId + '">');
        });
    });

})();