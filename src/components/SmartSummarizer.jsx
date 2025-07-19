/* global chrome */
import { useState, useEffect } from "react";
import { FaCopy } from "react-icons/fa6";
import { MdDone } from "react-icons/md";
import LoadingSpinner from "./LoadingSpinner";
import ReactMarkdown from "react-markdown";

export default function SmartSummarizer() {
  {
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [type, setType] = useState("concise");

    useEffect(() => {
      chrome.storage.local.get(["lastSummary"], (result) => {
        if (result.lastSummary) {
          setResponse(result.lastSummary);
        }
      });
    }, []);

    const handleSummarize = async () => {
      setLoading(true);
      setResponse("");

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

      try {
        const tempQuery = await getPageText();
        let prompt;
        if (type === "concise") {
          prompt =
            "Give a concise (not more than a paragraph) summary of the following:\n\n" +
            tempQuery;
        } else if (type === "detailed") {
          prompt = "Give a detailed summary of the following:\n\n" + tempQuery;
        } else {
          prompt =
            "Give a summary of the following in bullet points (like highlights):\n\n" +
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
              model: "meta-llama/llama-4-maverick",
              messages: [{ role: "user", content: prompt }],
            }),
          }
        );

        const data = await res.json();
        console.log(data);
        const content = data.choices[0].message.content;
        setResponse(content);
        chrome.storage.local.set({ lastSummary: content });
      } catch (error) {
        console.log(error);
        setResponse("❌ Could not extract or summarize this page!");
      }

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
          <h1 className="m-4 font-bold text-2xl my-2">Smart Summarizer</h1>
          <div className="m-4">
            <select
              value={type}
              onChange={handleTypeChange}
              className="p-1 border rounded-md shadow-2xl hover:cursor-pointer bg-gray-100"
            >
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="bullets">Bullets</option>
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
              }}
              className="ml-2 p-1 border rounded-md shadow-2xl bg-green-400 hover:cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="w-110 h-110 my-4">
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

            {response ? (
              <div className="max-h-96 overflow-auto whitespace-pre-wrap p-5">
                <ReactMarkdown>{response}</ReactMarkdown>
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
}
