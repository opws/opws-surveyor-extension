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

function getPageOuterHTML(tabId) {
  return new lastErrorPromise(resolve =>
    chrome.tabs.executeScript({
      code: 'document.documentElement.outerHTML'
    }, resolve));
}

function getCodeElementTextContent(tabId) {
  return new lastErrorPromise(resolve =>
    chrome.tabs.executeScript({
      code: 'document.getElementsByTagName("code")[0].textContent'
    }, resolve));
}

function getPageAsMHTML(tabId) {
  return new lastErrorPromise(resolve =>
    chrome.pageCapture.saveAsMHTML({tabId}, resolve));
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
      "specimen.mhtml": tuple[0], "document_outer.html": tuple[1]
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
