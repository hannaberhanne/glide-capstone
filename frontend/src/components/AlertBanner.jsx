import { useEffect } from "react";
import './AlertBanner.css';

export default function AlertBanner({ message, type = "success", onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    };

    return (
        <div className={`alert banner--${type}`}>
            <span className="icon">{icons[type]}</span>
            {message}
        </div>
    );
}