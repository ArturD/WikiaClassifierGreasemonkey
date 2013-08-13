// ==UserScript==
// @name       Wikia classifier
// @namespace  http://wikia.com/
// @version    0.4
// @description  enter something useful
// @match      http://*.wikia.com/*
// @match      http://www.wowwiki.com/*
// @match      http://*.wikipedia.org/*
// @match      http://*.memory-alpha.org/*
// @copyright  2012+, You
// @require       https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.js
// ==/UserScript==
var jq = jQuery.noConflict();

(function (window, unsafeWindow, $) {
    
    // avoid iframes
    if (unsafeWindow.top != unsafeWindow.self) return;

    
})(window, unsafeWindow, jq);

(function (jQuery) {
    var styles = ".classificator ul { padding-left: 10px }\n" +
        ".classificator .label { padding: 0 3px; font-weight: bold; }";
    var hosts = [ "http://db-sds-s2:8081/graph-0.3.1", "http://db-sds-s1:8081/graph-0.3.1", "http://localhost:8080", "http://localhost:9998" ];
    var $ = jQuery;
    var types = [ "other", "tv_episode", "tv_series", "tv_season", "ability", "unit", "person", "organization", "level", "achievement", "location", "item", "weapon", "book", "movie", "game", "character", "music_band", "music_recording", "music_album", "vehicle" ];
    var storageUrl = "http://megimikos.pl:5984/facts/";
    if (unsafeWindow.top != unsafeWindow.self) return;
    
    
    function getDomainFromUrl( url ) {
        if( url.indexOf('http://') == 0 ) {
            return url.split('/')[2];
        } else {
       		return null;
        }
    }
    
    function getPageInfo() {     
        var info = {};
        info.url       = $('link[rel=canonical]').attr('href') || unsafeWindow.location.href;
        info.articleId = unsafeWindow.wgArticleId;
        info.cityId    = parseInt( unsafeWindow.wgCityId, 10 );
        info.title     = unsafeWindow.wgTitle;
        info.namespace = unsafeWindow.wgNamespaceNumber;
        info.lang      = unsafeWindow.wgContentLanguage;
        info.domain    = getDomainFromUrl( info.url );
        return info;
	}
    
    function render( obj ) {
        var div = $('<div>');
        div.html('<b style="font-weight:bold">' + obj.class + '</b>');
        var ul = $('<ul>');
        for( var i in obj.classes ) {
        	var cls = obj.classes[i];
            var li = $('<li>');
            li.css({color: "#888"});
            li.html( "<span style=\"display: inline-block; min-width: 120px;\">" + i + ":</span> " + (Math.round(cls*10000)/10000) );
            ul.append( li );
        }
        div.append(ul);
        return div;
    }
    
    function getCurrentClassificationFromCouch( callback ) {
        var info = getPageInfo();
        $.ajax({
            type: "GET",
            url: storageUrl + encodeURIComponent( info.url ),
            success: function(x) {
            	callback(x);
        	},
            dataType: "json"
        });
    }
    
    function updateCurrentClass() {
        $('.type-placeholder').text('loading ...');
        getCurrentClassificationFromCouch( function(data) {
        	$('.type-placeholder').text(data.type);    
        } );
    }
    
    function renderUpdater() {
        var div = $('<div>');
        for( var i in types ) {
            var info = getPageInfo();
        	var type = types[i];
            var button = $('<button data-type="' + type + '" value="' + type + '">' + type + '</button>');
            button.click(function() {
                var type = $(this).data('type');
                var info = getPageInfo();
                GM_log( "click: " + type );
            	getCurrentClassificationFromCouch( function( currentVersion ) {
                    info.type = type;
                    info._rev = currentVersion._rev;
                	GM_log( "rev: " + info._rev);
                    $.ajax({
                        type: "PUT",
                        url: storageUrl + encodeURIComponent( info.url ),
                        data: JSON.stringify(info),
                        success: function(x) {
                            GM_log(x);
                            updateCurrentClass();
                        },
                        dataType: "json"
                    });       
                });
            });
            div.append(button);
        }
        return div;
    }
    updateCurrentClass();
    
    function getClassificationsFromHost(wiki, page, callback, host) {
        GM_log(host + "/classifications/" + wiki + "/" + page);
    	var req = GM_xmlhttpRequest({
          method: "GET",
          url: host + "/classifications/" + wiki + "/" + page,
          onload: function(response) {
            GM_log(response);
            if( response.status != 200 ) {
            	callback(null);
        	} else {
            	var obj = JSON.parse(response.responseText);
            	callback(obj);
    		}
          },
 		  onerror: function() { callback(null); } 
        });
    }
    function getClassifications(wiki, page, callback, hostList) {
        if( !hostList ) hostList = hosts;
        if ( hostList.length == 0 ) {
        	//callback( null );
            return;
        }
        getClassificationsFromHost(wiki, page, function( response ) {
            if( response == null ) {
            	getClassifications( wiki, page, callback, hostList.slice(1) );
            } else {
				callback( response );                
            }
        }, hostList[0]);
    }
     
    $(function() {
        var box = $('<div class="description classificator">');
        box.css({
            position: 'absolute',
            top: '35px',
            right: '15px',
            background: 'white',
            'min-width': '150px',
            'min-height': '150px',
            opacity: 0.9,
            'z-index': 1000,
            'color': 'black',
            padding: '10px 20px',
            'max-width': '300px'
        });
        box.hover(function() {
            box.css({opacity: 1});
              }, function() {
            //box.css({opacity: 0.6});
        });    
        box.append('<h2>' + getPageInfo().domain + '</h2>');
        box.append('<h4>' + getPageInfo().title + '</h4>');
        getClassifications(getPageInfo().domain, getPageInfo().title, function(obj) {
        	var d = render(obj);
            box.append(d);
        });
        box.append('<div class="type-placeholder">loading ... </div>');
        box.append(renderUpdater());
        $('body').append('<style> ' + styles + ' </style>');
        $('body').append(box);
    });
})(jq);
