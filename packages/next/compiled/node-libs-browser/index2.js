(()=>{var e={102:(e,r,o)=>{var n=o(837);var a=o(491);function now(){return(new Date).getTime()}var t=Array.prototype.slice;var i;var l={};if(typeof global!=="undefined"&&global.console){i=global.console}else if(typeof window!=="undefined"&&window.console){i=window.console}else{i={}}var s=[[log,"log"],[info,"info"],[warn,"warn"],[error,"error"],[time,"time"],[timeEnd,"timeEnd"],[trace,"trace"],[dir,"dir"],[consoleAssert,"assert"]];for(var f=0;f<s.length;f++){var c=s[f];var u=c[0];var p=c[1];if(!i[p]){i[p]=u}}e.exports=i;function log(){}function info(){i.log.apply(i,arguments)}function warn(){i.log.apply(i,arguments)}function error(){i.warn.apply(i,arguments)}function time(e){l[e]=now()}function timeEnd(e){var r=l[e];if(!r){throw new Error("No such label: "+e)}delete l[e];var o=now()-r;i.log(e+": "+o+"ms")}function trace(){var e=new Error;e.name="Trace";e.message=n.format.apply(null,arguments);i.error(e.stack)}function dir(e){i.log(n.inspect(e)+"\n")}function consoleAssert(e){if(!e){var r=t.call(arguments,1);a.ok(false,n.format.apply(null,r))}}},491:e=>{"use strict";e.exports=require("assert")},837:e=>{"use strict";e.exports=require("util")}};var r={};function __nccwpck_require__(o){var n=r[o];if(n!==undefined){return n.exports}var a=r[o]={exports:{}};var t=true;try{e[o](a,a.exports,__nccwpck_require__);t=false}finally{if(t)delete r[o]}return a.exports}if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var o=__nccwpck_require__(102);module.exports=o})();