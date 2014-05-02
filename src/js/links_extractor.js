(function() {

    var api_key = '416cc19fe9a30033731f9fd97b2e1f66';
    var DOMAIN = '//iframe.ly';

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

    $.iframely.defaults.endpoint = DOMAIN + "/api/iframely";

    function loadLink(link) {

        isWhitelisted(link.uri, function(whitelisted) {

            if (!whitelisted) {
                return;
            }

            $.iframely.getPageData(link.uri, {
                api_key: api_key,
                origin: 'gmail',
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

                    var x =
                        '<div class="aLF-aPX aLF-aPX-a5n aLF-aPX-aLK-aPD-JE s-overlay" tabindex="0" style="opacity: 1;">' +
                        '    <div class="aT1-aTZ aLF-aPX-auR" tabindex="0"></div>' +
                        '    <div class="aLF-aPX-aXi-I J-J5-Ji aLF-aPX-I s-open-new" aria-label="Open in new window" title="Open in new window" role="button" tabindex="0"' +
                        '         style="-webkit-user-select: none; right: 37px;">' +
                        '        <div class="aLF-aPX-JX aLF-aPX-Km-JX"></div>' +
                        '    </div>' +
                        '    <div class="aLF-aPX-Jq-I J-J5-Ji aLF-aPX-I s-close" aria-label="Close" title="Close" role="button" tabindex="0"' +
                        '         style="-webkit-user-select: none; right: 12px;">' +
                        '        <div class="aLF-aPX-JX aLF-aPX-Km-JX"></div>' +
                        '    </div>' +
                        '    <div class="aLF-aPX-aPk"' +
                        '        <div class="aLF-aPX-aPk-aMh aLF-aPX-Jq-aPn" style="width: 100%; height: 100%; margin: 10%; margin-left: 20%;">' +
                        '            <div class="aLF-aPX-ayV aLF-aPX-ayV-aPV" tabindex="0"' +
                        '                <div class="aLF-aPX-ayV-atM"></div>' +
                        '                <iframe id="drive-viewer-video-player-object-0" class="aLF-aPX-ayV-aL3"' +
                        '                        style="width: 60%; height: 60%;" frameborder="0" allowfullscreen="1"' +
                        '                        title="YouTube video player" width="1165.8108108108108" height="655"' +
                        '                        src="' + DOMAIN + '/' + data.id + '"></iframe>' +
                        '            </div>' +
                        '            <div class="aLF-aPX-aPA">' +
                        '            </div>' +
                        '    </div>' +
                        '</div>';

                    $('body>*').each(function() {
                        $(this).attr('aria-hidden', 'true');
                    })
                    $('body').append(x);
                    $('body').addClass('aLF-aPX-aPs-JQ');

                    function close() {
                        $('body').removeClass('aLF-aPX-aPs-JQ');
                        $('.s-overlay').remove();
                        $('body>*').each(function() {
                            $(this).removeAttr('aria-hidden');
                        })
                    }

                    var $buttonOpen = $('body').find('.s-open-new').click(function() {
                        var win = window.open(link.uri, '_blank');
                        win.focus();
                        $buttonOpen.removeClass('aLF-aPX-I-JW');
                    }).hover(function() {
                        $buttonOpen.addClass('aLF-aPX-I-JW');
                    }, function() {
                        $buttonOpen.removeClass('aLF-aPX-I-JW');
                    });

                    var $buttonClose = $('body').find('.s-close').click(close).hover(function() {
                        $buttonClose.addClass('aLF-aPX-I-JW');
                    }, function() {
                        $buttonClose.removeClass('aLF-aPX-I-JW');
                    });
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

        $.iframely.getPageData(link.uri, {
            api_key: api_key,
            origin: 'gmail',
            url: true
        }, function(err, data) {

            if (err) {
                error("iframely error on", link.uri, err, data);
                return;
            }

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
            var image = $.iframely.findBestFittedLink(link.$editor.width(), link.$editor.width(), images);

            if (!image) {
                // Skip non interesting link.
                return;
            }

            if (link.$editor.find('img[src="' + image.href + '"]').length > 0) {
                // Skip inserted image;
                return;
            }

            var iframelyUrl = "http:" + DOMAIN + "/" + data.id;

            var $div = $('<div>');

            var $a = $('<a href="' + iframelyUrl + '" target="_blank"></a>');
            var $img = $('<img>')
                .css("max-width", "100%")
                .attr('src', image.href);
            $a.append($img);

            if (title) {
                $img
                    .attr('title', title)
                    .attr('alt', title);
                $div.append('<a href="' + iframelyUrl + '" target="_blank">' + title + '</a><br>');
            }

            $div.append($a);

            var $p = null;
            var $firstP = null;
            link.$editor.find('div').each(function() {
                var $this = $(this);
                if (!$firstP) {
                    $firstP = $this;
                }
                if (!$p && $this.text().indexOf(link.uri) > -1) {
                    $p = $this;
                }
            });

            if ($p) {
                $p.after($div);
            } else if ($firstP) {
                $firstP.after($div);
            } else {
                link.$editor.append('<br>');
                link.$editor.append($div);
            }
        });
    }

    var insertedImages = {};

    function runEditorFeature() {

        $('.Am.Al.editable.LW-avf').each(function() {

            var $editor = $(this);

            var id = $editor.attr('id');

            var images = insertedImages[id] = insertedImages[id] || [];

            var urls = $editor.html().replace(/<[^>]+>/g, " ").match(urlRe) || [];

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

        runEditorFeature();

        runLinkParsing();

    }, 1000);

})();