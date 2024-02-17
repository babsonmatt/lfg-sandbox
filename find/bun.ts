const searchByUserId = new Map<number, { minRating: number }>();

// add 100k users to the searchByUserId map
for (let i = 0; i < 100000; i++) {
  // randomize a min rating
  const minRating = Math.floor(Math.random() * 3000);
  searchByUserId.set(i, { minRating });
}

console.time("find");
// find users with a minrating >= 1200
const result = Array.from(searchByUserId).filter(
  ([userId, { minRating }]) => minRating >= 1200
);
console.timeEnd("find");

console.log(result.length);
