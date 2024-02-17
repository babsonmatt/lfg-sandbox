import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const useEventSource = (url, options) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Function to handle each message event
    const onMessage = (event) => {
      setData((currentData) => [...currentData, event.data]);
    };

    // Function to handle errors
    const onError = (err) => {
      setError(err);
      console.error("Event Source failed:", err);
    };

    // Setting up the EventSource
    fetchEventSource(url, {
      ...options,
      onopen: () => console.log("Connection opened."),
      onmessage: onMessage,
      onerror: onError,
      fetch: window.fetch, // You can use a custom fetch function if needed
    });

    // Cleanup function
    return () => {
      if (options.signal) {
        options.signal.abort();
      }
    };
  }, [url, options]);

  return { data, error };
};

export default useEventSource;
