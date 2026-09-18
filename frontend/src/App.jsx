import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Evaluate browser credentials on startup to maintain session persistence
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  // Prevent flash screens while the state machine evaluates local storage tokens
  if (checkingAuth) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loaderText}>
          Loading Nature Intelligence Environment...
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  );
}

const styles = {
  loaderContainer: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6f8",
    fontFamily: "system-ui, sans-serif",
  },
  loaderText: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#374151",
  },
};
