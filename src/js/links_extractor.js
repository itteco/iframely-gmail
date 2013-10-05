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
        /about/i,
        /faq/i,
        /help/i
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

    function loadLink(link) {

        isWhitelisted(link.uri, function(whitelisted) {

            $.iframely.getPageData(link.uri, function(error, data) {

                if (error) {
                    error("iframely error on", link.uri, error, data);
                    return;
                }

                var title = data.meta.title;
                var site = data.meta.site;

                var favicon, thumbnail, image, player;

                var icons = $.iframely.filterLinksByRel("icon", data.links, {httpsFirst: true});
                if (icons.length) {
                    favicon = icons[0].href;
                }

                // Find big image.
                var images = $.iframely.filterLinksByRel("image", data.links, {httpsOnly: true});
                if (images.length == 0) {
                    images = $.iframely.filterLinksByRel("image", data.links);
                }
                var image = $.iframely.findBestFittedLink(link.$container.width(), link.$container.width(), images);

                // Find player or survey or reader.
                var player = $.iframely.filterLinksByRel(["player", "survey", "reader"], data.links, {httpsFirst: true, returnOne: true});

                if (!image && !player) {
                    // Skip non interesting link.
                    return;
                }

                if (image && link.$mail.find('img[src="' + image.href + '"]').length > 0) {
                    return;
                }

                // Render.

                var htmlHead =
                    '<div class="nH hh s-igw" style="margin-bottom: 10px; background: none;">'+
                        '    <div class="c0">'+
                        '        <div class="cV">'+
                        '            <div class="cX">'+
                        '                <span class="cZ"></span><span class="cU"></span>'+
                        '            </div>'+
                        '            <div style="float: right;"><a href="http://iframely.com">Iframely</a>&nbsp;-&nbsp;<a href="#" class="s-hide-iframely">Close</a></div>'+
                        '            <div class="cT" style="padding-bottom: 10px;">'+
                        '            </div>'+
                        '        </div>'+
                        '    </div>'+
                        '</div>';

                if (link.$container.find('.s-buttons').length == 0) {
                    link.$container.append(htmlHead);
                    var $close = link.$container.find('.s-hide-iframely');
                    $close.click(function(e) {
                        e.preventDefault();
                        link.$container.find('.s-igw').remove();
                    });
                }

                //===
                var html =
                    '<div class="nH hh s-igw" style="padding-bottom: 3px">'+
                        '    <div class="c0">'+
                        '        <div class="cV">'+
                        '            <div class="cX" style="width: 90%; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">'+
                        '                <span class="cZ"></span><span class="cU"></span>'+
                        '            </div>'+
                        '            <div class="s-buttons" style="float: right;"></div>'+
                        '            <div class="cT">'+
                        '            </div>'+
                        '        </div>'+
                        '        <div style="padding-bottom: 10px; display: none;" class="s-container cV"></div>'+
                        '    </div>'+
                        '</div>';
                link.$container.append(html);
                var $hh = link.$container.children(".hh:last");
                //===

                if (!site) {
                    var domain = link.uri.match(/^(?:https?:\/\/)?([^\/]+)/);
                    if (domain) {
                        site = domain[1];
                    } else {
                        site = link.uri;
                    }
                }
                $hh.find('.cZ').html('<a href="' + link.uri + '">' + site + '</a>');

                if (!favicon) {
                    favicon = 'http://iframely.com/r4/img/favicon.ico';
                }
                $hh.find('.cX').prepend('<img class="cY" src="' + favicon + '" width="16" height="16">');
                if (title) {
                    $hh.find('.cU').text(' – ' + title);
                } else {
                    $hh.find('.cU').text('');
                }

                var $container = $hh.find('.s-container');
                var $btnContainer = $hh.find('.s-buttons');

                var MAX_INITIAL_OPEN = 3;
                function canOpen(aLink) {
                    link.context.initiallyOpenedCount = link.context.initiallyOpenedCount || 0;
                    if (link.context.initiallyOpenedCount < MAX_INITIAL_OPEN) {
/*
                        function isHttps(href) {
                            return href.indexOf('//:') == 0 || href.indexOf('https://') == 0;
                        }

                        if (!isHttps(aLink.href)) {
                            return false;
                        }
*/
                        if (aLink.rel.indexOf('reader') > -1) {
                            return false;
                        }

                        if (whitelisted || (aLink.rel.indexOf('allow') > -1 && aLink.rel.indexOf('autoplay') == -1)) {
                            link.context.initiallyOpenedCount++;
                            return true;
                        }

                    }
                    return false;
                }

                if (player) {

                    (function() {

                        var label;
                        if (player.rel.indexOf('survey') > -1) {
                            label = "Answer";
                        } else if (player.rel.indexOf('reader') > -1) {
                            label = "Read";
                        } else {
                            label = "Play";
                        }

                        $btnContainer.append('<a href="#" class="s-expand">' + label + '</a>');
                        $btnContainer.append('<a href="#" class="s-close" style="display: none;">Hide</a>');

                        var $expandButton = $btnContainer.find('.s-expand');
                        var $closeButton = $btnContainer.find('.s-close');
                        var $triggerButton = $container.find('.s-expand-image');

                        function trigger(open) {

                            if (open) {

                                $expandButton.hide();
                                $closeButton.show();
                                $container.show();

                                // Add player.
                                var $el = $.iframely.generateLinkElement(player, {iframelyData: data});
                                var $div = $('<div>').addClass('s-player').append($el);
                                $container.append($div);
                                $.iframely.registerIframesIn($container);

                            } else {

                                // Remove player.
                                $container.find('.s-player').remove();

                                $container.hide();

                                $expandButton.show();
                                $closeButton.hide();
                            }
                        }

                        $expandButton.click(function(e) {
                            e.preventDefault();
                            trigger(true);
                        });

                        $closeButton.click(function(e) {
                            e.preventDefault();
                            trigger(false);
                        });

                        $triggerButton.click(function(e) {
                            e.preventDefault();
                            trigger($expandButton.is(":visible"));
                        });

                        if (canOpen(player)) {
                            trigger(true);
                        }

                    })();

                } else if (image) {

                    (function() {

                        $container.append('<a href="#" class="s-expand-image"><img src="' + image.href + '" style="display: none; max-width: 100%;" class="s-image"></a>');

                        $btnContainer.append('<a href="#" class="s-expand">View</a>');
                        $btnContainer.append('<a href="#" class="s-close" style="display: none;">Hide</a>');

                        var $expandButton = $btnContainer.find('.s-expand');
                        var $closeButton = $btnContainer.find('.s-close');
                        var $triggerButton = $container.find('.s-expand-image');

                        function trigger(open) {

                            if (open) {

                                $expandButton.hide();
                                $closeButton.show();
                                $container.find('.s-image').show();

                                $container.show();

                            } else {

                                $expandButton.show();
                                $closeButton.hide();
                                $container.find('.s-image').hide();

                                $container.hide();
                            }
                        }

                        $expandButton.click(function(e) {
                            e.preventDefault();
                            trigger(true);
                        });

                        $closeButton.click(function(e) {
                            e.preventDefault();
                            trigger(false);
                        });

                        $triggerButton.click(function(e) {
                            e.preventDefault();
                            trigger($expandButton.is(":visible"));
                        });

                        if (canOpen(image)) {
                            trigger(true);
                        }

                    })();
                }

            });
        });
    }

    function loadImageToEditor(link) {

        if (skippedHref(link.uri)) {
            return;
        }

        $.iframely.getPageData(link.uri, function(err, data) {

            if (err) {
                error("iframely error on", link.uri, err, data);
                return;
            }

            var title = data.meta.title;

            var image;

            // Find big image.
            var images = $.iframely.filterLinksByRel("image", data.links, {httpsOnly: true});
            if (images.length == 0) {
                images = $.iframely.filterLinksByRel("image", data.links);
            }
            var image = $.iframely.findBestFittedLink(link.$editor.width(), link.$editor.width(), images);

            if (!image && data.links.length == 1 && data.links[0].href == link.uri && data.links[0].rel.indexOf('thumbnail') > -1) {
                image = data.links[0];
            }

            if (!image) {
                // Skip non interesting link.
                return;
            }

            if (link.$editor.find('img[src="' + image.href + '"]').length > 0) {
                // Skip inserted image;
                return;
            }

            var $img = $('<img>')
                .css("max-width", "100%")
                .attr('src', image.href);

            if (title) {
                $img
                    .attr('title', title)
                    .attr('alt', title);
            }

            var iframelyUrl = "http://iframely.com?from=gmref";
            var extensionUrl = "https://chrome.google.com/webstore/detail/" + appId;

            if (link.$editor.find('a[href="' + iframelyUrl + '"]').length == 0) {
                link.$editor.append('<br>');
                link.$editor.append('<a href="' + iframelyUrl + '">Iframely</a> embeds for <a href="' + extensionUrl + '">Gmail</a>')
            }

            var $separator = link.$editor.find('a[href="' + iframelyUrl + '"]');

            $separator.before($img);
            $separator.before('<br>');
        });
    }

    function removeNativeYoutube() {
        $('.nH.hh:not(.s-igw)').remove();
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
                if (href != text) {
                    return
                }

                if ($this.attr('data-iframely-used') == "true") {
                    return;
                }

                $this.attr('data-iframely-used', "true");

                links.push(href);
            });

            if (links.length > 0) {

                var $hi = $mail.find('.hi');

                firstOpened = false;

                // One context for group of one email links.
                var context = {};

                var linksDict = {};

                links.forEach(function(link, idx) {

                    if (skippedHref(link)) {
                        return;
                    }

                    if (link in linksDict) {
                        return;
                    }

                    linksDict[link] = true;

                    loadLink({
                        uri: link,
                        $container: $hi,
                        $mail: $mail,
                        context: context
                    });
                });
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

        removeNativeYoutube();

        runLinkParsing();

        runEditorFeature();

    }, 1000);

})();