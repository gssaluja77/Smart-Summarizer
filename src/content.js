/* global chrome */

const extractText = () => {
  const allParas = [];
  const allParaNodes = document.querySelectorAll("p");
  allParaNodes.forEach((node) => {
    allParas.push(node.innerText);
  });
  return allParas.join("\n");
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const extractedText = extractText();
    sendResponse({ extractedText });
  }
});
