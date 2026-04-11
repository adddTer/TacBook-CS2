import React, { useState } from 'react';
import { getTeams } from '../utils/teamLoader';

interface Player {
  id: string;
  name: string;
  steamId?: string;
}

interface Team {
  name: string;
  players: Player[];
}

export function LiquipediaScraper() {
  const [status, setStatus] = useState<string>('Ready');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [results, setResults] = useState<Record<string, Player[]>>({});
  const [isScraping, setIsScraping] = useState(false);
  const [exportData, setExportData] = useState<string>('');

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchApi = async (page: string) => {
    const url = `/api/liquipedia?action=parse&page=${encodeURIComponent(page)}&redirects=1&format=json`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return null;
      return data.parse.text['*'];
    } catch (e) {
      console.error(`Failed to fetch ${page}:`, e);
      return null;
    }
  };

  const extractTeams = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const teams = new Set<string>();
    
    doc.querySelectorAll('.teamcard center a').forEach(a => {
      if (a.textContent) teams.add(a.textContent.trim());
    });
    
    doc.querySelectorAll('.team-template-text a').forEach(a => {
      if (a.textContent) teams.add(a.textContent.trim());
    });

    // Also look for standard links in Portal:Teams
    doc.querySelectorAll('.navbox-list a').forEach(a => {
      if (a.textContent) teams.add(a.textContent.trim());
    });
    
    return Array.from(teams);
  };

  const extractPlayers = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const players: Player[] = [];
    
    const rosterTable = doc.querySelector('.roster-card');
    if (rosterTable) {
        rosterTable.querySelectorAll('tr.roster-player').forEach(tr => {
            const idNode = tr.querySelector('.ID a') || tr.querySelector('.ID');
            if (idNode && idNode.textContent) {
                const id = idNode.textContent.trim();
                players.push({
                    id: id,
                    name: id // Use in-game ID as name
                });
            }
        });
        return players;
    }
    
    const tables = doc.querySelectorAll('table');
    for (const table of Array.from(tables)) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => (th.textContent || '').trim().toLowerCase());
        const hasId = headers.includes('id');
        const hasName = headers.includes('name');
        const hasLeave = headers.some(h => h?.includes('leave') || h?.includes('inactive'));
        
        if (hasId && hasName && !hasLeave) {
            table.querySelectorAll('tr').forEach(tr => {
                const idNode = tr.querySelector('td:nth-child(2) a') || tr.querySelector('td a') || tr.querySelector('td:nth-child(2)');
                
                if (idNode && idNode.textContent && idNode.textContent.trim() !== '') {
                    const roleNode = tr.querySelector('td:nth-child(4)');
                    const role = roleNode ? (roleNode.textContent || '').trim().toLowerCase() : '';
                    
                    if (!role || (!role.includes('coach') && !role.includes('manager') && !role.includes('analyst') && !role.includes('streamer') && !role.includes('founder') && !role.includes('creator'))) {
                        const id = idNode.textContent.trim();
                        players.push({
                            id: id,
                            name: id // Use in-game ID as name
                        });
                    }
                }
            });
            if (players.length > 0) break;
        }
    }
    return players;
  };

  const extractSteamId = (html: string) => {
    // Try to find 64-bit Steam ID first
    const profileMatch = html.match(/steamcommunity\.com\/profiles\/(\d+)/);
    if (profileMatch) return profileMatch[1];
    
    // Fallback to custom URL ID
    const idMatch = html.match(/steamcommunity\.com\/id\/([^"'\s\?\/]+)/);
    if (idMatch) return idMatch[1];
    
    return '';
  };

  const startScraping = async () => {
    setIsScraping(true);
    setResults({});
    setExportData('');
    
    try {
      setStatus('Fetching team lists from Portals and Tournaments...');
      const vrsHtml = await fetchApi('Valve_Regional_Standings');
      await delay(1000);
      const cologneHtml = await fetchApi('Intel_Extreme_Masters/2024/Cologne');
      await delay(1000);
      const portalEuropeHtml = await fetchApi('Portal:Teams/Europe');
      await delay(1000);
      const portalAmericasHtml = await fetchApi('Portal:Teams/Americas');
      await delay(1000);
      
      const vrsTeams = vrsHtml ? extractTeams(vrsHtml) : [];
      const cologneTeams = cologneHtml ? extractTeams(cologneHtml) : [];
      const europeTeams = portalEuropeHtml ? extractTeams(portalEuropeHtml) : [];
      const americasTeams = portalAmericasHtml ? extractTeams(portalAmericasHtml) : [];
      
      // Get unique teams
      const allExtractedTeams = Array.from(new Set([...cologneTeams, ...vrsTeams, ...europeTeams, ...americasTeams]));
      
      // Get existing teams to skip
      const existingTeams = getTeams().map(t => t.name.toLowerCase());
      
      // Filter out existing teams and limit to 100
      const teamsToFetch = allExtractedTeams
        .filter(team => !existingTeams.includes(team.toLowerCase()))
        .slice(0, 100);
      
      setStatus(`Found ${teamsToFetch.length} new teams to fetch (skipped ${allExtractedTeams.length - teamsToFetch.length} existing). Fetching rosters...`);
      setProgress({ current: 0, total: teamsToFetch.length });
      
      const finalData: any[] = [];
      
      for (let i = 0; i < teamsToFetch.length; i++) {
        const team = teamsToFetch[i];
        setStatus(`Fetching roster for ${team}...`);
        
        const teamHtml = await fetchApi(team);
        await delay(1000); // Respect rate limit
        
        if (teamHtml) {
          const players = extractPlayers(teamHtml);
          
          // Fetch Steam IDs for each player
          for (let j = 0; j < players.length; j++) {
            setStatus(`Fetching Steam ID for ${players[j].id} (${team})...`);
            const playerHtml = await fetchApi(players[j].id);
            await delay(1000); // Respect rate limit
            
            if (playerHtml) {
              const steamId = extractSteamId(playerHtml);
              if (steamId) {
                players[j].steamId = steamId;
              }
            }
          }
          
          if (players.length > 0) {
            const formattedPlayers = players.map(p => ({
                id: p.id,
                name: p.name,
                role: "Player",
                roleType: "Player",
                steamids: p.steamId ? [p.steamId] : []
            }));
            
            const teamObj = {
                id: team.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                name: team,
                type: "professional",
                players: formattedPlayers
            };
            finalData.push(teamObj);
            setResults(prev => ({ ...prev, [team]: formattedPlayers }));
          }
        }
        
        setProgress({ current: i + 1, total: teamsToFetch.length });
      }
      
      // Store the array format for export, formatted so it can be appended
      if (finalData.length > 0) {
          const jsonString = JSON.stringify(finalData, null, 2);
          // Remove the outer brackets and add a leading comma so it can be pasted directly before the last ']' in the existing file
          const appendableString = ",\n" + jsonString.substring(1, jsonString.length - 1).trim();
          setExportData(appendableString);
      } else {
          setExportData('');
      }
      
      setStatus('Scraping complete!');
    } catch (error) {
      console.error(error);
      setStatus('Error occurred during scraping.');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Liquipedia API 过渡工具</h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          从 Liquipedia 自动获取职业队伍、选手名单及 Steam ID。
          <br/>
          <span className="text-blue-500 font-medium">已自动跳过本地已存在的队伍。</span>
        </p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={startScraping}
          disabled={isScraping}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
            isScraping 
              ? 'bg-neutral-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20'
          }`}
        >
          {isScraping ? '获取中...' : '开始获取数据'}
        </button>
        
        <div className="flex-1">
          <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            状态: <span className="text-blue-600 dark:text-blue-400">{status}</span>
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {exportData && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">导出数据 (可直接追加)</h3>
            <button 
              onClick={() => navigator.clipboard.writeText(exportData)}
              className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-bold transition-colors"
            >
              复制追加数据
            </button>
          </div>
          <p className="text-xs text-neutral-500 mb-2">
            请将以下内容直接粘贴到 <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">data/teams/professional_teams.json</code> 文件的倒数第二行（即最后一个 <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">]</code> 之前）。
          </p>
          <textarea 
            readOnly
            value={exportData}
            className="w-full h-64 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">获取结果预览</h3>
        {Object.entries(results).length === 0 && !isScraping && (
          <div className="text-center py-12 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
            暂无数据
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(results).map(([team, players]) => (
            <div key={team} className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <h4 className="font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {team}
              </h4>
              <div className="space-y-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{p.id}</span>
                    <span className="text-xs font-mono text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded">
                      {p.steamId || 'No Steam ID'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
