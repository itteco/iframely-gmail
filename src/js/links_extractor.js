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

                    //alert(JSON.stringify(image || player));

                    var x =
                        '<div class="aLF-aPX aLF-aPX-a5n aLF-aPX-aLK-aPD-JE" tabindex="0" style="opacity: 1;">' +
                        '    <div class="aT1-aTZ aLF-aPX-auR" tabindex="0"></div>' +
                        '    <div class="aLF-aPX-aXi-I J-J5-Ji aLF-aPX-I" aria-label="Open in new window" role="button" tabindex="0"' +
                        '         style="-webkit-user-select: none; right: 37px;">' +
                        '        <div class="aLF-aPX-JX aLF-aPX-Km-JX"></div>' +
                        '    </div>' +
                        '    <div class="aLF-aPX-Jq-I J-J5-Ji aLF-aPX-I" aria-label="Close" role="button" tabindex="0"' +
                        '         style="-webkit-user-select: none; right: 12px;">' +
                        '        <div class="aLF-aPX-JX aLF-aPX-Km-JX"></div>' +
                        '    </div>' +
                        '    <div class="aLF-aPX-aPk" style="bottom: 67px;">' +
                        '        <div class="aLF-aPX-aPk-aMh aLF-aPX-Jq-aPn">' +
                        '            <div class="aLF-aPX-ayV aLF-aPX-ayV-aPV" tabindex="0"' +
                        '                 style="width: 1166px; height: 655px; left: 254.59459459459458px; top: 40px;">' +
                        '                <div class="aLF-aPX-ayV-atM"></div>' +
                        '                <iframe id="drive-viewer-video-player-object-0" class="aLF-aPX-ayV-aL3"' +
                        '                        style="width: 1166px; height: 655px;" frameborder="0" allowfullscreen="1"' +
                        '                        title="YouTube video player" width="1165.8108108108108" height="655"' +
                        '                        src="https://www.youtube.com/embed/Miee8dE0SM4?definition=hd&amp;default=https%3A%2F%2Fi1.ytimg.com%2Fvi%2FMiee8dE0SM4%2Fdefault.jpg&amp;medium=https%3A%2F%2Fi1.ytimg.com%2Fvi%2FMiee8dE0SM4%2Fmqdefault.jpg&amp;high=https%3A%2F%2Fi1.ytimg.com%2Fvi%2FMiee8dE0SM4%2Fhqdefault.jpg&amp;standard=https%3A%2F%2Fi1.ytimg.com%2Fvi%2FMiee8dE0SM4%2Fsddefault.jpg&amp;el=preview&amp;cc_load_policy=1&amp;authuser=0&amp;enablejsapi=1&amp;disablekb=1&amp;cc3_module=1&amp;html5=1&amp;origin=https%3A%2F%2Fmail.google.com"></iframe>' +
                        '            </div>' +
                        '            <div class="aLF-aPX-aPA">' +
                        '            </div>' +
                        '        </div>' +
                        '    </div>' +
                        '    <div class="aLF-aPX-aw3" style="height: 67px;">' +
                        '        <div class="aLF-aPX-aPU">' +
                        '            <div class="aLF-aPX-aPU-Gs">' +
                        '                <div class="aLF-aPX-aPU-JX" aria-label="YouTube"' +
                        '                     style="background-image: url(https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_2_youtube_x16.png); background-position: 0% 0%; background-repeat: no-repeat no-repeat;"></div>' +
                        '                <div class="aLF-aPX-aPU-awu">' +
                        '                    <div class="aLF-aPX-aPU-awE" style="width: 268px;">Turbulence Simulation Test With 6 Million' +
                        '                        Particles' +
                        '                    </div>' +
                        '                    <div class="aLF-aPX-aPU-awE aLF-aPX-aPU-awE-aPK">Turbulence Simulation Test With 6 Million' +
                        '                        Particles' +
                        '                    </div>' +
                        '            </div>' +
                        '            <div class="aLF-aPX-aPU-atn">' +
                        '                <div class="aLF-aPX-aPU-Kq-a1b-aPC">' +
                        '                </div>' +
                        '                <div class="aLF-aPX-aPU-ato-ayr-aLF aLF-aPX-auO-I J-J5-Ji aLF-aPX-I" role="button" aria-hidden="true"' +
                        '                     style="-webkit-user-select: none; display: none;">' +
                        '                    <div class="aLF-aPX-aPU-ato-ayr-aLF-JX"></div>' +
                        '                </div>' +
                        '                <div class="aLF-aPX-aPU-Mw-P6"></div>' +
                        '                <div class="aLF-aPX-aPU-Mw-P6">' +
                        '                    <div class="aLF-aPX-auO-I aLF-aPX-Mw-I aLF-aPX-Mw-I-ay5-JX J-J5-Ji aLF-aPX-I aLF-aPX-I-JE"' +
                        '                         aria-label="Завантажити" role="button" aria-disabled="true" aria-hidden="true"' +
                        '                         style="-webkit-user-select: none; display: none;">' +
                        '                        <div class="aLF-aPX-JX aLF-aPX-Mw-I-JX aLF-aPX-aYT-JX"></div>' +
                        '                    </div>' +
                        '                    <div class="aLF-aPX-Ng-M aLF-aPX-auO-I J-J5-Ji aLF-aPX-I" aria-label="Більше" aria-expanded="false"' +
                        '                         role="button" aria-haspopup="true" aria-hidden="true"' +
                        '                         style="-webkit-user-select: none; display: none;">' +
                        '                        <div class="aLF-aPX-Ng-M-K0">More</div>' +
                        '                        <div class="aLF-aPX-aPU-M-I-hFsbo"></div>' +
                        '                    </div>' +
                        '                </div>' +
                        '            </div>' +
                        '        </div>' +
                        '        <div class="aLF-aPX-aPq aLF-aPX-aPH" tabindex="-1" aria-hidden="true"></div>' +
                        '    </div>' +
                        '</div>';

                    $('body>*').each(function() {
                        $(this).attr('aria-hidden', 'true');
                    })
                    $('body').append(x);
                    $('body').addClass('aLF-aPX-aPs-JQ');
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