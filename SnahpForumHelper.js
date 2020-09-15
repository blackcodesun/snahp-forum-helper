// ==UserScript==
// @name         Snahp Forum Helper
// @namespace    http://tampermonkey.net/
// @version      0.91
// @description  Highlight base64 or separated mega link/key, then press Ctrl+Shift to combine, decode and copy link into clipboard so jDownloader picks it up.  Please reference my github page (https://github.com/blackcodesun) if you use any of my code.  Thanks!
// @author       blackcodesun@gmail.com, https://github.com/blackcodesun
// @match        http*://*.snahp.it/*
// @grant        none
// @require      http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==
/*jslint browser:true,devel:true,long:true*/
/*global window,btoa,atob*/
/*
*EXAMPLE PATTERN - LINK ONLY
Megalink Key: !VlKBHwg9Bbl2XxQXnD6cGc2ECLYM4dfCaMVWSdEQxiE

*EXAMPLE PATTERN - LINK & KEY
Mega - #P!eH7C8YSC
Key - !Jc8J3Knuoq1wPsGcGulc5Q

*EXAMPLE - LINK & KEY W/ REMOVE WORD
L: Lm56LyMhOXVnVkJSQ0M=
K: IXE1Vi1EMFFnX3hWQ2tXcyMkSGlzVE9SWW9GTWFHaWMlJFZBY2cxZy1DWGdaU1Z5b0lIMVBnVkdDZzI3RUE=
Add mega to Link. Remove #$HisTORYoFMaGic%$ from Key
*/
(function (init) {
    "use strict";
    init(window.jQuery.noConflict(true), window, document);
}(function ($, window, document) {
    "use strict";
    $(document).ready(function () {
        // DOM objects return Unicode (16-bit) strings... convert string to UTF-8 before Encoding.
        // Function by Brandonscript, http://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
        function base64EncodeUnicode(str) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(ignore, p1) {
                return String.fromCharCode("0x" + p1);
            }));
        }
        function base64DecodeUnicode(str) {
            return decodeURIComponent(atob(str).split("").map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(""));
        }

        // Test if Base64 String
        function isBase64(str) {
            if (str === "" || str.trim() === "") {
                return false;
            }
            try {
                return base64EncodeUnicode(base64DecodeUnicode(str)) === str;
            } catch (ignore) {
                return false;
            }
        }

        // Base64 decode string until it's not a base64 string
        function base64Decode(str) {
            var i = 0;
            var maxDecodes = 100;
            var originalStr = str;
            while (isBase64(str) && i < maxDecodes) {
                str = base64DecodeUnicode(str);
                i += 1;
                console.log({"maxDecodes": maxDecodes, "iterations": i, "base64Decode": originalStr, "str": str});
            }
            return str;
        }

        // Removes line breaks from a string
        function removeLinebreaks(str) {
            var linebreakPattern = /(?:\r\n|\r|\n)/gm;
            if (linebreakPattern.test(str)) {
                str = str.replace(linebreakPattern, "");
                console.log({"removingLinebreaks": str});
            }
            return str;
        }

        // Get mouse selection as string and match regex patterns to find link/key. Decode and copy to clipboard.
        function scrapeSelection() {
            console.time("scrapeTime");
            var selection = window.getSelection().toString();
            console.log({"selection": selection});
            var link = "";
            var key = "";
            // Link & Key Pattern
            var linkKeyPattern = /^[\s\S]*?(?:L|M|Mega|Link)\s*(?:\:|\-)\s*?(\S+)[\s\S]*?(?:K|Key)\s*(?:\:|\-)\s*?(\S+)[\s\S]*$/gim;
            var linkKeyMatch = linkKeyPattern.exec(selection);
            if (linkKeyMatch && linkKeyMatch.length === 3) {
                link = linkKeyMatch[1];
                key = linkKeyMatch[2];
                console.log({"link": link, "key": key});
            } else {
                // Link Only Pattern
                var linkPattern = /^[\s\S]*?(?:MegaLink\sKey|Base64x2)\s*:\s*?(\S+)[\s\S]*$/gim;
                var linkMatch = linkPattern.exec(selection);
                if (linkMatch && linkMatch.length === 2) {
                    link = linkMatch[1];
                    console.log({"link": link});
                } else {
                    // No pattern matched
                    link = selection;
                    console.log({"noMatchUsingSelection": link});
                }
            }

            //Remove Linebreaks
            link = removeLinebreaks(link);
            key = removeLinebreaks(key);
            console.log({"removeLinebreaksLink": link, "removeLinebreaksKey": key});

            // Base64 decode link many times
            link = base64Decode(link);
            key = base64Decode(key);
            console.log({"base64DecodeLink": link, "base64DecodeKey": key});

            // Combine link and key
            if (key.length > 0) {
                link = link + "#" + key;
                console.log({"combineLinkAndKey": link});
                // Decode after link is combined with key
                link = base64Decode(link);
                console.log({"base64DecodeLinkAndKey": link});
            }

            // Remove Words from link
            var removeWords = [];
            var removePattern = /^[\s\S]*?(?:Remove)\s*(\S+)[\s\S]*$/gim;
            var removeMatch = removePattern.exec(selection);
            if (removeMatch && removeMatch.length === 2) {
                removeWords.push(removeMatch[1]);
            }
            removeWords.forEach(function (removeWord) {
                link = link.split(removeWord).join("");
                console.log({"removeWord": removeWord, "link": link});
            });

            // link cleanup
            if (link.startsWith(".nz")) {
                link = "https://mega" + link;
                console.log({"addedMegaDomain": link});
            }
            if (link.includes("xxxx.nz")) {
                link = link.replace("xxxx.nz", "mega.nz");
                console.log({"replacedXXXXWithMega": link});
            }
            if (!link.includes("https://") && link.length > 0) {
                link = "https://mega.nz/" + link;
                console.log({"prependedHttpMegaNZ": link});
            }
            // if URL pattern is found,
            var urlPattern = /^(http|https|ftp|ftps):\/\/\S+$/gi;
            if (urlPattern.test(link)) {
                console.log({"pasting": link});
                navigator.clipboard.writeText(link);
            } else {
                console.log({"noPasteNotURL": link});
            }
            console.timeEnd("scrapeTime");
        }

        // Keeps track of ctrl-key press status
        var isControlKeyDown = false;
        function listenForKeyClicks() {
            console.log("\nListening for Ctrl+Shift keypress...");
            window.addEventListener("keydown", function (event) {
                console.log({"pressedKey": event.key, "keyCode": event.key.charCodeAt(0), "isControlKeyDown": isControlKeyDown});
                if (event.key === "Control") {
                    isControlKeyDown = true;
                }
                if (event.key === "Shift" && isControlKeyDown) {
                    // Ctrl+Shift pressed together, scrape highlighted text
                    scrapeSelection();
                }
            });
            window.addEventListener("keyup", function (event) {
                if (event.key === "Control") {
                    isControlKeyDown = false;
                }
            });
        }

        // Main Function
        function main() {
            console.log("\nSnahp Forum Helper has STARTED");
            listenForKeyClicks();
        }

        // Start Here. . .. ... ..... ........
        main();
    });
}));
