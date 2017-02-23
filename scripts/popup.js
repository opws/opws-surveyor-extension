/* global chrome */

"use strict";

function lastErrorPromise(cb) {
  return new Promise((resolve, reject) => {
    cb(value => chrome.runtime.lastError
      ? reject(chrome.runtime.lastError)
      : resolve(value));
  });
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
  chrome.runtime.sendMessage({
    method: reMailsacRaw.test(activeTab.url)
      ? 'postEmailCodeTextSpecimen' : 'postPageSpecimen',
    tabId: activeTab.id,
    description: specimenDescriptionInput.value
  });
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