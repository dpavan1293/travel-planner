import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import netlifyIdentity from "netlify-identity-widget";
import "./index.css";
import App from "./App.jsx";

netlifyIdentity.init();

// Un link di condivisione (/shared/<token>) va comunque aperto da un utente loggato:
// serve un account per ricevere la copia del viaggio sul proprio spazio. Il token
// viene semplicemente passato all'app una volta effettuato l'accesso.
const sharedTokenMatch = window.location.pathname.match(/^\/shared\/([a-zA-Z0-9]+)/);
const pendingShareToken = sharedTokenMatch ? sharedTokenMatch[1] : null;

function Root() {
  const [user, setUser] = useState(netlifyIdentity.currentUser());

  useEffect(() => {
    const onLogin = (u) => {
      setUser(u);
      netlifyIdentity.close();
    };
    const onLogout = () => setUser(null);

    netlifyIdentity.on("login", onLogin);
    netlifyIdentity.on("logout", onLogout);
    return () => {
      netlifyIdentity.off("login", onLogin);
      netlifyIdentity.off("logout", onLogout);
    };
  }, []);

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          textAlign: "center",
          padding: 24,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          background: "linear-gradient(135deg, #AEE1F9 0%, #8FD3D9 40%, #7FCBB4 65%, #F5C089 100%)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 650, color: "#1B2430", margin: 0 }}>Travel Planner</h1>
        <p style={{ fontSize: 14, color: "rgba(27,36,48,0.7)", margin: 0, maxWidth: 320 }}>
          {pendingShareToken
            ? "Accedi o registrati per ricevere il viaggio che ti è stato condiviso."
            : "Accedi per vedere i tuoi viaggi, sincronizzati su tutti i tuoi dispositivi."}
        </p>
        <button
          onClick={() => netlifyIdentity.open("login")}
          style={{
            border: "none",
            borderRadius: 20,
            padding: "12px 26px",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            background: "#1B2430",
            cursor: "pointer",
          }}
        >
          Accedi o registrati
        </button>
      </div>
    );
  }

  return <App user={user} onLogout={() => netlifyIdentity.logout()} pendingShareToken={pendingShareToken} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
