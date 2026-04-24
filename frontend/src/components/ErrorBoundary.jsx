import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "32px",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          background: "var(--bg-color, #f5f1e8)",
          color: "var(--text-color, #3e3731)",
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: 650, marginBottom: "8px" }}>
            Something went wrong.
          </h2>
          <p style={{ color: "var(--text-muted, #7a6e65)", marginBottom: "24px", fontSize: "14px" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "var(--highlight-color, #9caf88)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Return home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
