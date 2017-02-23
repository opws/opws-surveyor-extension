/* global chrome gistachio */

function lastErrorPromise(cb) {
  return new Promise((resolve, reject) => {
    cb(value => chrome.runtime.lastError
      ? reject(chrome.runtime.lastError)
      : resolve(value));
  });
}

function nodebackPromise(cb) {
  return new Promise((resolve, reject) => {
    cb((err, value) => err ? reject(err) : resolve(value));
  });
}

function postAnonymousGist(files, description) {
  return new nodebackPromise(resolve =>
    gistachio.postFiles(files, {description, public: false}, resolve));
}

function expressionInActiveTab(code) {
  return new lastErrorPromise(resolve =>
    chrome.tabs.executeScript({code}, resolve)).then(results => results[0]);
}

function getPageOuterHTML(tabId) {
  return expressionInActiveTab('document.documentElement.outerHTML')
    .then(html => '<!DOCTYPE html>\n' + html);
}

function getCodeElementTextContent(tabId) {
  return expressionInActiveTab(
    'document.getElementsByTagName("code")[0].textContent');
}

function getPageAsMHTML(tabId) {
  return new lastErrorPromise(resolve =>
    chrome.pageCapture.saveAsMHTML({tabId}, resolve)
  ).then(mhtmlBlob => new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.addEventListener("loadend", e =>
      reader.error ? reject(reader.error) : resolve(reader.result));
    reader.readAsText(mhtmlBlob);
  }));
}

function openGistInNewTab(gistId, openerTabId) {
  chrome.tabs.create({
    url: 'https://gist.github.com/anonymous/' + gistId,
    openerTabId});
}

function postPageSpecimen(tabId, description) {
  return Promise.all([
    getPageAsMHTML(tabId), getPageOuterHTML(tabId)
  ]).then(tuple =>
    postAnonymousGist({
      "specimen.mhtml": tuple[0], "documentElement.html": tuple[1]
    }, description)
  ).then(gistId =>
    openGistInNewTab(gistId, tabId));
}

function postEmailCodeTextSpecimen(tabId, description) {
  return getCodeElementTextContent(tabId).then(textContent =>
    postAnonymousGist({"specimen.eml": textContent}, description)
  ).then(gistId =>
    openGistInNewTab(gistId, tabId));
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  switch (message.method) {
    case 'postPageSpecimen':
      postPageSpecimen(message.tabId, message.description);
      break;
    case 'postEmailCodeTextSpecimen':
      postEmailCodeTextSpecimen(message.tabId, message.description);
      break;
  }
});
