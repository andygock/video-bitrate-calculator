import React, { useState, useEffect, useRef } from "react";
import { parseInput, CalculationResult, help } from "./lib";
import "./App.css";

const storageKey = "calculationHistory";

const App: React.FC = () => {
  const [history, setHistory] = useState<CalculationResult[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (input.startsWith("/clear")) {
      handleClearHistory();
      return;
    } else if (input.startsWith("/help")) {
      setHistory([...history, { input, output: help() }]);
      return;
    }

    try {
      const result = parseInput(input);

      if (typeof result === "string") {
        setHistory([...history, { input, output: result }]);
      } else if (typeof result === "object") {
        // result must be an object with only input and output properties
        if (!("input" in result) || !("output" in result)) {
          console.log("Invalid result object.", result);
          throw new Error("Invalid result object.");
        }
        setHistory([
          ...history,
          {
            input: result.input,
            output: result.output,
          },
        ]);
      } else {
        console.log("Invalid result type.", result);
        throw new Error("Invalid result type.");
      }

      setInput("");
      setHistoryIndex(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setHistory([...history, { input, output: `${e.toString()}` }]);
      } else {
        console.log("Unknown error", e);
        setHistory([
          ...history,
          { input, output: "An unknown error occurred." },
        ]);
      }
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      if (historyIndex === null) {
        setHistoryIndex(history.length - 1);
        setInput(history[history.length - 1]?.input || "");
      } else if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setInput(history[historyIndex - 1]?.input || "");
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex !== null && historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
        setInput(history[historyIndex + 1]?.input || "");
      } else {
        setHistoryIndex(null);
        setInput("");
      }
    }
  };

  return (
    <div className="terminal-container">
      <div className="output-window">
        {history.map((entry, index) => (
          <div key={index}>
            <div>&gt; {entry.input}</div>
            <div>{entry.output}</div>
          </div>
        ))}
      </div>
      <form onSubmit={handleInputSubmit}>
        <input
          className="input-box"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Example commands '500M 1h30m 1920x1080 25fps', '/clear', or '/help'"
        />
      </form>
    </div>
  );
};

export default App;
