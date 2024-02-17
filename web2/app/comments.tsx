"use client";
import React from "react";
import { SSEProvider, useSSE } from "react-hooks-sse";

const url = "https://lfg.local/api/source";

type State = {
  comments: string[];
};

type Message = {
  value: string;
};

const Comments = () => {
  const state = useSSE<State, Message>(
    "comments",
    {
      comments: [],
    },
    {
      stateReducer(prevState, action) {
        return {
          comments: [action.data.value, ...prevState.comments],
        };
      },
      parser(input) {
        return JSON.parse(input);
      },
    }
  );

  console.log("state", state);

  return (
    <p>
      {state.comments.map((comment) => {
        return <div key={comment}>{comment}</div>;
      })}
    </p>
  );
};

const CommentsAll = () => {
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

export default CommentsAll;
