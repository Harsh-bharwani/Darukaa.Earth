import React, { useState } from "react";
import api from "../utils/api";

export default function Login({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Trigger the backend registration endpoint
        await api.post("/register", { email, password });
        // After clean registration, flip automatically to login mode for the user
        setIsRegister(false);
        setError("Account created successfully! Please log in.");
      } else {
        // Trigger login: FastAPI OAuth2 expects standard urlencoded form fields
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await api.post("/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        // Store token in browser local storage and notify the App root layer
        localStorage.setItem("token", response.data.access_token);
        onAuthSuccess();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        "An unexpected error occurred. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Darukaa.Earth</h2>
        <p style={styles.subtitle}>
          {isRegister
            ? "Create an Administrator Account"
            : "Nature Intelligence Dashboard"}
        </p>

        {error && (
          <div
            style={{
              ...styles.alert,
              backgroundColor: error.includes("success")
                ? "#e6f4ea"
                : "#fce8e6",
              color: error.includes("success") ? "#137333" : "#c5221f",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@darukaa.earth"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading
              ? "Processing..."
              : isRegister
                ? "Register Account"
                : "Sign In"}
          </button>
        </form>

        <p style={styles.toggleText}>
          {isRegister ? "Already have an account?" : "Need an admin account?"}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={styles.toggleLink}
          >
            {isRegister ? " Log In" : " Register Now"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f8",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "2.5rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    margin: "0.5rem 0 2rem 0",
    fontSize: "0.95rem",
    color: "#6b7280",
  },
  alert: {
    padding: "0.75rem",
    borderRadius: "6px",
    fontSize: "0.85rem",
    marginBottom: "1.25rem",
    textAlign: "left",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    textAlign: "left",
  },
  inputGroup: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label: { fontSize: "0.85rem", fontWeight: "600", color: "#374151" },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
  },
  button: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  toggleText: { marginTop: "1.5rem", fontSize: "0.85rem", color: "#4b5563" },
  toggleLink: { color: "#059669", fontWeight: "600", cursor: "pointer" },
};
