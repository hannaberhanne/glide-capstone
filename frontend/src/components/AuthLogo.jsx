// src/components/AuthLogo.jsx
import { Link } from "react-router-dom";
import "./AuthLogo.css";

export default function AuthLogo() {
  return (
    <Link to="/" className="authlogo">
      <svg width="130" height="70" viewBox="0 0 130 70" fill="none">
        <text x="0" y="44" fontFamily="Libre Baskerville,serif" fontStyle="italic" fontWeight="700" fontSize="44" fill="var(--text-color)">G</text>
        <text x="31" y="44" fontFamily="Libre Baskerville,serif" fontWeight="400" fontSize="35" fill="var(--text-color)">lide</text>
        <text x="88" y="38" fontFamily="Libre Baskerville,serif" fontWeight="700" fontSize="18" fill="var(--achievement-color)">+</text>
        <g transform="translate(31,48) rotate(-7)">
        <path d="M2 4 Q4 1.5 8 2 L62 1.5 Q68 1 71 3.5 L71 8 Q68 10 62 9.5 L8 10 Q4 10.5 2 8 Z" fill="var(--text-color)"/>
        <rect x="5" y="9.5" width="9" height="2.2" rx="1.1" fill="#6B5E54"/>
        <circle cx="7"  cy="15.5" r="5"   fill="var(--achievement-color)"/>
        <circle cx="7"  cy="15.5" r="2.4" fill="var(--text-color)"/>
        <circle cx="17" cy="15"   r="5"   fill="var(--achievement-color)"/>
        <circle cx="17" cy="15"   r="2.4" fill="var(--text-color)"/>
        <rect x="58" y="8.2" width="9" height="2.2" rx="1.1" fill="#6B5E54"/>
        <circle cx="60" cy="14"   r="5"   fill="var(--achievement-color)"/>
        <circle cx="60" cy="14"   r="2.4" fill="var(--text-color)"/>
        <circle cx="70" cy="13.5" r="5"   fill="var(--achievement-color)"/>
        <circle cx="70" cy="13.5" r="2.4" fill="var(--text-color)"/>
  </g>
</svg>
    </Link>
  );
}