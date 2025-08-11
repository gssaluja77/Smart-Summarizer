/* global chrome */
import { useState, useEffect } from "react";
import { FaCopy } from "react-icons/fa6";
import { MdDone } from "react-icons/md";
import LoadingSpinner from "./LoadingSpinner";
import ReactMarkdown from "react-markdown";
import { Typewriter } from "./Typewriter";

export default function SmartSummarizer() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [type, setType] = useState("concise");
  const [messageOnDelay, setMessageOnDelay] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [fetchedLocally, setFetchedLocally] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["lastSummary"], (result) => {
      if (result.lastSummary) {
        setResponse(result.lastSummary);
        setFetchedLocally(true);
      }
    });
  }, []);

  const handleSummarize = async () => {
    setResponse("");
    setFetchedLocally(false);
    setLoading(true);

    const getPageText = () => {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (!tab || !tab.id) {
            reject("No active tab found");
            return;
          }

          chrome.tabs.sendMessage(
            tab.id,
            { type: "GET_ARTICLE_TEXT" },
            (res) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
              }

              resolve(res?.extractedText || "");
            }
          );
        });
      });
    };
    const ifDelayed = setTimeout(() => {
      setMessageOnDelay(
        "⏳ Hang on! Some pages can take slightly longer to process..."
      );
    }, 5000);

    try {
      const tempQuery = await getPageText();
      let prompt;
      if (type === "concise") {
        prompt =
          "Give a concise (not more than a paragraph) summary of the following:\n\n" +
          tempQuery;
      } else if (type === "detailed") {
        prompt = "Give a detailed summary of the following:\n\n" + tempQuery;
      } else if (type === "bullets") {
        prompt =
          "Give a summary of the following in bullet points (like highlights):\n\n" +
          tempQuery;
      } else {
        prompt =
          "I am applying for the role of Software Engineer whose about page contains the following. Tell me how to answer the question 'Why are you interested in working here?' in a short paragraph (3-4 lines):\n\n" +
          tempQuery;
      }

      const res = await fetch(
        "https://smart-summarizer-backend.onrender.com/api/smart-summarizer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const data = await res.json();
      const content = data.choices[0].message.content;
      setResponse(content);
      chrome.storage.local.set({ lastSummary: content });
    } catch {
      setResponse("❌ Could not extract or summarize this page!");
    }

    setMessageOnDelay(null);
    clearTimeout(ifDelayed);
    setLoading(false);
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleTypeChange = (event) => {
    setType(() => event.target.value);
  };

  return (
    <div className="flex justify-center">
      <div>
        <h1 className="m-4 font-bold text-2xl my-2 text-gray-100">Smart Summarizer</h1>
        <div className="m-4">
          <select
            value={type}
            onChange={handleTypeChange}
            className="p-1 border rounded-md shadow-2xl hover:cursor-pointer bg-gray-100"
          >
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="bullets">Bullets</option>
            <option value="about">About Company</option>
          </select>
          <button
            onClick={handleSummarize}
            className="ml-2 p-1 border rounded-md shadow-2xl bg-blue-400 hover:cursor-pointer"
          >
            Summarize
          </button>
          <button
            onClick={() => {
              setResponse("");
              setCopied(false);
              setLoading(false);
              chrome.storage.local.remove("lastSummary");
              setFetchedLocally(false);
            }}
            className="ml-2 p-1 border rounded-md shadow-2xl bg-green-400 hover:cursor-pointer"
          >
            Clear
          </button>
        </div>
        <div className="w-110 h-110 my-4 text-gray-100">
          <div className="flex justify-between">
            <div className="p-5 flex justify-center">
              {loading && <LoadingSpinner />}
            </div>
            <div className="p-5 flex justify-end">
              {copied ? (
                <MdDone size={16} className="hover:cursor-pointer" />
              ) : (
                response && (
                  <FaCopy
                    size={16}
                    onClick={handleCopy}
                    className="hover:cursor-pointer"
                  />
                )
              )}
            </div>
          </div>

          {messageOnDelay && (
            <div className="max-h-96 overflow-auto whitespace-pre-wrap p-5">
              <ReactMarkdown>{messageOnDelay}</ReactMarkdown>
            </div>
          )}
          {response ? (
            <div className="max-h-96 overflow-auto whitespace-pre-wrap p-5">
              {!fetchedLocally && (
                <Typewriter text={response} onChange={setTypedText} />
              )}
              <ReactMarkdown>
                {!fetchedLocally ? typedText : response}
              </ReactMarkdown>
            </div>
          ) : (
            !loading && (
              <div className="text-gray-400 max-h-96 overflow-auto whitespace-pre-wrap p-5">
                Select how do you want this page to be summarized...
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
