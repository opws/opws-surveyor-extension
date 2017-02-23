/* global chrome gistachio */

"use strict";

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

function getActiveTab() {
  return new lastErrorPromise(resolve =>
    chrome.tabs.query({active: true, currentWindow: true}, resolve)
    ).then(tabs => tabs[0]);
}

let activeTab = null;
let reMailsacRaw = /^https?:\/\/mailsac\.com\/raw\//;

let specimenDescriptionInput = document.getElementById('specimen-description');
let specimenButton = document.getElementById('specimen-button');

function updateButtonState() {
  if (reMailsacRaw.test(activeTab.url)) {
    specimenButton.textContent = "Save email specimen";
  } else {
    specimenButton.textContent = "Save page specimen";
  }
}

function saveSpecimen() {
  (reMailsacRaw.test(activeTab.url) ? postEmailCodeTextSpecimen
    : postPageSpecimen)(activeTab.id, specimenDescriptionInput.value);
}

specimenButton.addEventListener('click', saveSpecimen);

function setActiveTabState(tab) {
  if (!activeTab) addActiveTabUpdateListeners();
  activeTab = tab;
  updateButtonState();
}

function updateActiveTabState() {
  return getActiveTab().then(setActiveTabState);
}

function addActiveTabUpdateListeners() {
  chrome.tabs.onActivated.addListener(
    activeInfo => updateActiveTabState());

  chrome.windows.onFocusChanged.addListener(
    windowId => updateActiveTabState());

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId == activeTab.id) {
      return setActiveTabState(tab);
    }
  });
}

updateActiveTabState();