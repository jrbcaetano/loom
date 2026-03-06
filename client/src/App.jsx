import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/message")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="app">
      <h1>Loom v1</h1>
      <p>Client is connected to the server endpoint.</p>

      {error && <p className="error">Error: {error}</p>}

      {data ? (
        <section className="card">
          <p>
            <strong>Message:</strong> {data.message}
          </p>
          <p>
            <strong>Timestamp:</strong> {data.timestamp}
          </p>
        </section>
      ) : (
        !error && <p>Loading server response...</p>
      )}
    </main>
  );
}

