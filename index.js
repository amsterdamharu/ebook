const fs = require('fs');
const http = require('http');
//npm install request
const request = require('request');
//npm install jsdom
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const promiseLike =
x =>
  (x!==undefined && typeof x.then === "function")
;
const ifPromise =
  (fn) =>
  (x) =>
    promiseLike(x)
      ?x.then(fn)
      :fn(x)
;
const throttle =
  (max) =>{
    var que = [];
    var queIndex =-1;
    var running = 0;
    const wait = (resolve,fn,arg) => () =>
      resolve(ifPromise(fn)(arg))||true;//should always return true
    const nextInQue = ()=>{
      ++queIndex;
      if(typeof que[queIndex]==="function"){
        return que[queIndex]();
      }else{
        que=[];
        queIndex=-1;
        running = 0;
        return "Does not matter, not used";
      }
    };
    const queItem = (fn,arg)=>
      new Promise(
        (resolve,reject)=>que.push(wait(resolve,fn,arg))
      )
    ;
    return (fn)=>(arg)=>{
      const p = queItem(fn,arg)
        .then(x=>nextInQue() && x)
      ;
      running++;
      if(running<=max){
        nextInQue();
      }
      return p;
    };    
  }
;



function getFilename(url) {
  return decodeURI(url).split("/").slice(-1)[0];
}
function saveFile(url) {
  request(url).pipe(fs.createWriteStream("img/" + getFilename(url)));
}
const saveImages = (window) => {
  [].slice.call(window.document.body.querySelectorAll("img"))
    .forEach((el) => {
      var url = el.src;
      saveFile(url);
      el.src = "img/" + getFilename(url);
    });
}
exports.tmpPostProcessHtml = function (fileName) {
  return getWindow(fileName).then((window) => {
    saveImages(window);
    exports.writeToFile(window.document.body.innerHTML);
  });
}

function getWindow(url) {
  console.log("getting:", url);
  const virtualConsole = new jsdom.VirtualConsole();
  virtualConsole.on("error", () => {  });
  virtualConsole.on("warn", () => {  });
  virtualConsole.on("info", () => {  });
  virtualConsole.on("dir", () => {  });
  return JSDOM.fromURL(url,{ virtualConsole }).then(dom => dom.window);
}

const max8 = throttle(2);
exports.getHtml = function (urls, morph) {
  return Promise.all(
    urls.map(
      url=>
        max8(getWindow)(url)
        .then((window) => {
          console.log("done one:", url);
          morph(window);
          // saveImages(window);
          return {
            success:true,
            html:window.document.body.innerHTML,
            url:url
          };
        })
        .catch(
          (reject) => ({
            success:false,
            html:"",
            err:reject,
            url:url
          })
        )
    )
  );
}
exports.writeToFile = function (html) {
  fs.writeFile('out.html', `<html xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/1999/xhtml"><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">`+ html + "</body></html>", (err) => {
      if (err) throw err;
      console.log('It\'s saved!');
    });
  return 22;
}
var urls = [
  "https://reactjs.org/docs/hello-world.html",
  "https://reactjs.org/docs/introducing-jsx.html",
  "https://reactjs.org/docs/rendering-elements.html",
  "https://reactjs.org/docs/components-and-props.html",
  "https://reactjs.org/docs/state-and-lifecycle.html",
  "https://reactjs.org/docs/handling-events.html",
  "https://reactjs.org/docs/conditional-rendering.html",
  "https://reactjs.org/docs/lists-and-keys.html",
  "https://reactjs.org/docs/forms.html",
  "https://reactjs.org/docs/lifting-state-up.html",
  "https://reactjs.org/docs/composition-vs-inheritance.html",
  "https://reactjs.org/docs/thinking-in-react.html"
];

const morph = window => {
  window.document.querySelector("header").remove();
  window.document.querySelector(".css-1kbu8hg").remove();
  window.document.querySelector(".css-1m173d1").remove();
  window.document.querySelector("footer").remove();
  window.document.querySelector(".css-uygc5k").remove();
  window.document.querySelectorAll("script").forEach(x=>x.remove());
  window.document.querySelectorAll("iframe").forEach(x=>x.remove());
}

exports.getHtml(urls,morph)
.then(
  (results) => {
    console.log("------done, failed:", results.filter((o) => !o.success));
    return results;
  }
)
.then(
  results =>
    exports.writeToFile(
      results
      .filter((o) => o.success)
      .map((o) => o.html)
      .join("")
    )
);

