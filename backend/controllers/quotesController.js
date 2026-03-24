import { db } from "../config/firebase.js";

export const getQuote = async (req, res) => {
  try {
    const snapshot = await db.collection("quotes").get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No quotes found" });
    }

    const quotes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // --- DAILY SEED ---
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    // simple hash function
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = (hash << 5) - hash + dateKey.charCodeAt(i);
      hash |= 0;
    }

    const index = Math.abs(hash) % quotes.length;
    const quote = quotes[index];

    res.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
};