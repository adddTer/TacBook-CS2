const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('./teams_data.json', 'utf-8'));
const finalData = [];

for (const [teamName, players] of Object.entries(rawData)) {
    const formattedPlayers = players.map(p => ({
        id: p.id,
        name: p.id,
        role: p.name === 'Coach' ? 'Coach' : 'Player',
        roleType: p.name === 'Coach' ? 'Coach' : 'Player',
        steamids: []
    }));
    
    finalData.push({
        id: teamName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: teamName,
        type: 'professional',
        players: formattedPlayers
    });
}

fs.writeFileSync('./data/teams/professional_teams.json', JSON.stringify(finalData, null, 2));
console.log('Converted and saved to ./data/teams/professional_teams.json');
