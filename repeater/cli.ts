async function go(id: number) {
  const res = await fetch("http://localhost:3000/sse");
  for await (const message of res.body) {
    console.log(id, message);
  }
}

for (let i = 0; i < 10000; i++) {
  go(i);
}
