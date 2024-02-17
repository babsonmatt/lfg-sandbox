"use client";
import React from "react";
import { useSSE, SSEProvider } from "react-hooks-sse";

const url = 'https://lfg.local/api/source'

const Comments = () => {
  const state = useSSE("comments", {
    value: null,
  });

  console.log("state", state);

  return <div>{state.value}</div>;
};

const SSE = () => {
  return (
    <SSEProvider
      //   endpoint="http://localhost:8080/source"
      source={() =>
        new EventSource(url, {
          withCredentials: true,
        })
      }
    >
      <h1>Subscribe & update to SSE event</h1>
      <Comments />
    </SSEProvider>
  );
};

export default SSE;
