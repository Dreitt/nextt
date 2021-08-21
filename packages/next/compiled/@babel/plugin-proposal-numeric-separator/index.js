module.exports=(()=>{"use strict";var e={287:(e,r)=>{Object.defineProperty(r,"__esModule",{value:true});r.declare=declare;function declare(e){return(r,t,o)=>{if(!r.assertVersion){r=Object.assign(copyApiObject(r),{assertVersion(e){throwVersionError(e,r.version)}})}return e(r,t||{},o)}}function copyApiObject(e){let r=null;if(typeof e.version==="string"&&/^7\./.test(e.version)){r=Object.getPrototypeOf(e);if(r&&(!has(r,"version")||!has(r,"transform")||!has(r,"template")||!has(r,"types"))){r=null}}return Object.assign({},r,e)}function has(e,r){return Object.prototype.hasOwnProperty.call(e,r)}function throwVersionError(e,r){if(typeof e==="number"){if(!Number.isInteger(e)){throw new Error("Expected string or integer value.")}e=`^${e}.0.0-0`}if(typeof e!=="string"){throw new Error("Expected string or integer value.")}const t=Error.stackTraceLimit;if(typeof t==="number"&&t<25){Error.stackTraceLimit=25}let o;if(r.slice(0,2)==="7."){o=new Error(`Requires Babel "^7.0.0-beta.41", but was loaded with "${r}". `+`You'll need to update your @babel/core version.`)}else{o=new Error(`Requires Babel "${e}", but was loaded with "${r}". `+`If you are sure you have a compatible version of @babel/core, `+`it is likely that something in your build process is loading the `+`wrong version. Inspect the stack trace of this error to look for `+`the first entry that doesn't mention "@babel/core" or "babel-core" `+`to see what is calling Babel.`)}if(typeof t==="number"){Error.stackTraceLimit=t}throw Object.assign(o,{code:"BABEL_VERSION_UNSUPPORTED",version:r,range:e})}},788:(e,r,t)=>{Object.defineProperty(r,"__esModule",{value:true});r.default=void 0;var o=t(593);var i=t(619);function remover({node:e}){var r;const{extra:t}=e;if(t!=null&&(r=t.raw)!=null&&r.includes("_")){t.raw=t.raw.replace(/_/g,"")}}var a=(0,o.declare)(e=>{e.assertVersion(7);return{name:"proposal-numeric-separator",inherits:i.default,visitor:{NumericLiteral:remover,BigIntLiteral:remover}}});r.default=a},593:(e,r)=>{Object.defineProperty(r,"__esModule",{value:true});r.declare=declare;function declare(e){return(r,o,i)=>{var a;let n;for(const e of Object.keys(t)){var s;if(r[e])continue;n=(s=n)!=null?s:copyApiObject(r);n[e]=t[e](n)}return e((a=n)!=null?a:r,o||{},i)}}const t={assertVersion:e=>r=>{throwVersionError(r,e.version)},targets:()=>()=>{return{}},assumption:()=>()=>{}};function copyApiObject(e){let r=null;if(typeof e.version==="string"&&/^7\./.test(e.version)){r=Object.getPrototypeOf(e);if(r&&(!has(r,"version")||!has(r,"transform")||!has(r,"template")||!has(r,"types"))){r=null}}return Object.assign({},r,e)}function has(e,r){return Object.prototype.hasOwnProperty.call(e,r)}function throwVersionError(e,r){if(typeof e==="number"){if(!Number.isInteger(e)){throw new Error("Expected string or integer value.")}e=`^${e}.0.0-0`}if(typeof e!=="string"){throw new Error("Expected string or integer value.")}const t=Error.stackTraceLimit;if(typeof t==="number"&&t<25){Error.stackTraceLimit=25}let o;if(r.slice(0,2)==="7."){o=new Error(`Requires Babel "^7.0.0-beta.41", but was loaded with "${r}". `+`You'll need to update your @babel/core version.`)}else{o=new Error(`Requires Babel "${e}", but was loaded with "${r}". `+`If you are sure you have a compatible version of @babel/core, `+`it is likely that something in your build process is loading the `+`wrong version. Inspect the stack trace of this error to look for `+`the first entry that doesn't mention "@babel/core" or "babel-core" `+`to see what is calling Babel.`)}if(typeof t==="number"){Error.stackTraceLimit=t}throw Object.assign(o,{code:"BABEL_VERSION_UNSUPPORTED",version:r,range:e})}},619:(e,r,t)=>{Object.defineProperty(r,"__esModule",{value:true});r.default=void 0;var o=t(287);var i=(0,o.declare)(e=>{e.assertVersion(7);return{name:"syntax-numeric-separator",manipulateOptions(e,r){r.plugins.push("numericSeparator")}}});r.default=i}};var r={};function __nccwpck_require__(t){if(r[t]){return r[t].exports}var o=r[t]={exports:{}};var i=true;try{e[t](o,o.exports,__nccwpck_require__);i=false}finally{if(i)delete r[t]}return o.exports}__nccwpck_require__.ab=__dirname+"/";return __nccwpck_require__(788)})();