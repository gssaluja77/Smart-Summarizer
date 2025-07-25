import { useEffect } from "react";

export const Typewriter = ({ text, onChange }) => {
  useEffect(() => {
    let index = 0;
    let currentText = "";
    const interval = setInterval(() => {
      const char = text[index];
      currentText += char;
      onChange?.(currentText);
      index++;
      if (index === text.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text, onChange]);

  return null;
};
