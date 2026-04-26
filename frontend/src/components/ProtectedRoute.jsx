import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../config/firebase.js";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setStatus(user ? "auth" : "unauth");
    });
    return unsub;
  }, []);

  if (status === "pending") return null;
  if (status === "unauth") return <Navigate to="/login" replace />;
  return children;
}
