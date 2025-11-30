// src/components/AuthLogo.jsx
import { Link } from "react-router-dom";
import "./AuthLogo.css";

export default function AuthLogo() {
  return (
    <Link to="/" className="authlogo">
      <span className="authlogo-text">Glide</span>
      <span className="authlogo-plus">+</span>
    </Link>
  );
}