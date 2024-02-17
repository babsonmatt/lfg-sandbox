const token = "USP7LHN1tcZrgq5LNVeLTRMNw0YXEG1uEZ";
const pvpBracket = "shuffle-hunter-beastmastery";
// const pvpBracket = "2v2";

async function getPvpLeaderboard() {
  const response = await fetch(
    `https://us.api.blizzard.com/data/wow/pvp-season/36/pvp-leaderboard/${pvpBracket}?namespace=dynamic-us`,
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data;
}

async function getCharacterEquipment(realmSlug: string, characterName: string) {
  const url = `https://us.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/equipment?namespace=profile-us`;
  console.log(url);
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

async function main() {
  const data = await getPvpLeaderboard();
  const char = data.entries[0];

  const equipment = await getCharacterEquipment(
    char.character.realm.slug,
    char.character.name
  );

  console.log(equipment);
}

main();
