(function() {

    var DOMAIN = '//iframe.ly';
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

    function enableEditorFeature(cb) {
        chrome.extension.sendMessage({method: "getLocalStorage", key: "disable-editor-feature"}, function(result) {
            cb(result != "true")
        });
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
        /google/i
    ];

    var urlRe = /https?:\/\/[^ \/,"]+\/[^ ,"]+/ig;

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

    function loadLink(link) {

        isWhitelisted(link.uri, function(whitelisted) {

            if (!whitelisted) {
                return;
            }

            loadLinkCached(link.uri, 'gmail', function(data) {

                var image, player;

                var links = [];
                for(var key in data.links) {
                    links = links.concat(data.links[key]);
                }
                data.links = links;

                // Find good link.
                var foundLink = $.iframely.filterLinksByRel(["player", "survey", "reader", "app", "image"], data.links, {returnOne: true, httpsFirst: true});
                if (!foundLink) {
                    // Skip non interesting link.
                    return;
                }

                if (data.meta.title) {
                    link.$el.attr('title', data.meta.title);
                }

                link.$el.click(function(e) {
                    e.preventDefault();

                    if (foundLink.href.indexOf('http://') === 0 && foundLink.type.indexOf('image') === -1 && foundLink.type.indexOf('video') === -1) {
                        var win = window.open('http://' + DOMAIN + '/' + data.id, '_blank');
                        win.focus();
                        return;
                    }

                    var m = foundLink.media;
                    var aspect = m['aspect-ratio'];
                    if (!aspect && m.width && m.height) {
                        aspect = m.width / m.height;
                    }
                    aspect = aspect || 4/3;

                    var x =
                        '<div class="iframely-gmail">' +
                        '    <div class="iframely-gmail__toolbar">' +
                        '        <a href="http://' + DOMAIN + '/' + data.id + '" target="_blank" class="iframely-gmail__btn iframely-gmail__btn--logo" title="Go to Iframely"></a>' +
                        '        <button class="iframely-gmail__btn iframely-gmail__btn--link s-open-new" title="Pop-out"></button>' +
                        '        <button class="iframely-gmail__btn iframely-gmail__btn--close s-close" title="Close"></button>' +
                        '    </div>' +
                        '    <div class="iframely-gmail__wrapper">' +
                        '        <iframe class="iframely-widget iframely-iframe" src="' + DOMAIN + '/' + data.id + '" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" style="position: relative;"></iframe>' +
                        '    </div>' +
                        '</div>';

                    var $body = $('body');
                    var $window = $(window);

                    $body.append(x);

                    $body.on('keydown.iframely',function(e) {
                        if (e.keyCode === 27) {
                            close();
                        }
                    });

                    var $container = $('.iframely-gmail__wrapper');
                    var $iframe = $('.iframely-iframe');
                    function resize() {
                        var cw = $container.width();
                        var ch = $container.height();
                        var tw = Math.min(cw, m['width'] || m['max-width'] || cw);
                        var th = Math.min(ch, m['height'] || m['max-height'] || ch);
                        var ca = tw/th;
                        var width, height;
                        if (ca < aspect) {
                            $iframe.css('width', tw);
                            height = tw / aspect;
                            width = tw;
                            $iframe.css('height', height);
                        } else {
                            $iframe.css('height', th);
                            width = th * aspect;
                            height = th;
                            $iframe.css('width', width);
                        }
                        $iframe.css('top', (ch - height) / 2);
                        $iframe.css('left', (cw - width) / 2);
                    }

                    resize();

                    $window.on('resize.iframely', resize);

                    function close() {
                        $body.off('keydown.iframely');
                        $body.find('.iframely-gmail').remove();
                    }

                    $body.find('.s-open-new').click(function() {
                        var win = window.open(link.uri, '_blank');
                        win.focus();
                    });

                    $body.find('.s-close').click(close);
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


    function loadImageToEditor(link) {

        if (skippedHref(link.uri)) {
            return;
        }

        loadLinkCached(link.uri, 'geditor', function(data) {

            var title = data.meta.title;

            var links = [];
            for(var key in data.links) {
                links = links.concat(data.links[key]);
            }
            data.links = links;

            var image;

            // Find big image.
            var images = $.iframely.filterLinksByRel(["thumbnail", "image"], data.links, {httpsOnly: true});
            if (images.length == 0) {
                images = $.iframely.filterLinksByRel(["thumbnail", "image"], data.links);
            }
            var image = $.iframely.findBestFittedLink(200, 200, images);

            if (!image) {
                // Skip non interesting link.
                return;
            }

            if (link.$editor.find('img[src="' + image.href + '"]').length > 0) {
                // Skip inserted image;
                return;
            }

            var imageUrl = image.href.replace(/^\/\//, 'https://');

            $("<img/>")
                .load(function() {

                    var iframelyUrl = "http:" + DOMAIN + "/" + data.id;

                    var $div = $('<div>');

                    var $a = $('<a href="' + iframelyUrl + '" target="_blank"></a>');
                    var $img = $('<img>')
                        .css("max-width", "50%")
                        .attr('src', imageUrl);
                    $a.append($img);

                    $div.append($a);

                    if (title) {
                        $img
                            .attr('title', title)
                            .attr('alt', title);
                        $div.append('<br><a href="' + iframelyUrl + '" target="_blank">' + title + '</a>');
                    }

                    var $p = null;
                    var $firstP = null;
                    var $lastP = null;
                    link.$editor.find('div').each(function() {
                        var $this = $(this);
                        if (!$firstP) {
                            $firstP = $this;
                        }
                        if ($this.text().indexOf('--') > -1) {
                            $lastP = $this;
                        }
                        if (!$lastP && !$p && $this.text().indexOf(link.uri) > -1) {
                            $p = $this;
                        }
                    });

                    if ($p) {
                        $p.after($div);
                    } else if ($lastP) {
                        $firstP.before($div);
                    } if ($firstP) {
                        $firstP.after($div);
                    } else {
                        link.$editor.append('<br>');
                        link.$editor.append($div);
                    }

                })
                .error(function() {
                    // NOP.
                })
                .attr("src", imageUrl);
        });
    }

    var insertedImages = {};

    function runEditorFeature() {

        $('.Am.Al.editable.LW-avf:focus').each(function() {

            var $editor = $(this);

            var id = $editor.attr('id');

            var images = insertedImages[id] = insertedImages[id] || [];

            var bits = $editor.html().split('--');
            if (bits.length > 0) {
                bits = bits.slice(0, -1);
            }

            var text = bits.join('--');

            var urls = text
                .replace(/(<wbr>|&nbsp;)/g, "")
                .replace(/<[^>]+>/g, " ")
                .match(urlRe) || [];

            // Filter unique.
            urls = urls.filter(function(url) {
                var result = images.indexOf(url) == -1;
                if (result) {
                    images.push(url);
                }
                return result;
            });

            urls.forEach(function(url) {
                loadImageToEditor({
                    uri: url,
                    $editor: $editor
                });
            });
        });
    }

    setInterval(function() {

        runLinkParsing();

        enableEditorFeature(function(enabled) {
            if (enabled) {

            }
        });

    }, 1000);

    $('body').keyup(function(e) {
        if (e.keyCode === 13 || e.keyCode === 32) {
            runEditorFeature();
        }
    });

    var css = chrome.extension.getURL('css/styles.css');
    $('head').append('<link rel="stylesheet" href="' + css + '" type="text/css" />');

})();