import { useEffect, useState } from "react";
import "./GoalsPage.css";

export default function GoalsPage() {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        console.log("Fetching quote from backend...");

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/quotes`
        );

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();
        console.log("Quote received:", data);

        setQuote(data);
      } catch (err) {
        console.error("Error fetching quote:", err);
      }
    };

    fetchQuote();
  }, []);

  return (
    <>
      <div className="goals">
        <div className="goals-title">
          <h1>Goals</h1>
          {quote && (
            <p className="goals-quote">
              "{quote.text}" — {quote.author}
            </p>
          )}
        </div>

        <div className="goals-primary">
          <div className="goals-left"></div>
          <div className="goals-right"></div>
        </div>
      </div>
    </>
  );
}