import { HltvEvent } from '../types/hltv';

// Liquipedia MediaWiki API (Native CORS support via origin=*)
// We use the 'parse' action to get the HTML content of the 'Portal:Tournaments' page.
const LIQUIPEDIA_API_URL = 'https://liquipedia.net/counterstrike/api.php?action=parse&page=Portal:Tournaments&format=json&origin=*';

export const fetchHltvEvents = async (): Promise<HltvEvent[]> => {
    try {
        const response = await fetch(LIQUIPEDIA_API_URL);
        
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // MediaWiki API returns content in parse.text['*']
        const html = data.parse?.text?.['*'];

        if (!html) {
            throw new Error('No content received from Liquipedia API');
        }

        return parseLiquipediaEvents(html);
    } catch (error) {
        console.error("Failed to fetch real data from Liquipedia API:", error);
        return [];
    }
};

const parseLiquipediaEvents = (html: string): HltvEvent[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const events: HltvEvent[] = [];
    const processedIds = new Set<string>();

    // Strategy: Liquipedia Portal usually uses "grid" layout or tables for tournaments.
    // We look for .gridRow, .tournament-card, or standard tables.

    // 1. Try "Grid" style (common in portals)
    const gridCells = doc.querySelectorAll('.gridRow .gridCell');
    gridCells.forEach(cell => {
        const event = parseLiquipediaGridCell(cell);
        if (event && !processedIds.has(event.id)) {
            processedIds.add(event.id);
            events.push(event);
        }
    });

    // 2. Try Standard Tables (if grid fails or mixed)
    if (events.length === 0) {
        const rows = doc.querySelectorAll('table.wikitable tbody tr');
        rows.forEach(row => {
            // Skip header rows
            if (row.querySelector('th')) return; 
            
            const event = parseLiquipediaRow(row);
            if (event && !processedIds.has(event.id)) {
                processedIds.add(event.id);
                events.push(event);
            }
        });
    }
    
    // 3. Try "Tournament Card" divs (another common format)
    if (events.length === 0) {
        const cards = doc.querySelectorAll('div.tournament-card');
        cards.forEach(card => {
            const event = parseLiquipediaCard(card);
            if (event && !processedIds.has(event.id)) {
                processedIds.add(event.id);
                events.push(event);
            }
        });
    }

    return events;
};

const parseLiquipediaGridCell = (cell: Element): HltvEvent | null => {
    try {
        // Name is usually in a bold link
        const nameLink = cell.querySelector('b a') || cell.querySelector('a');
        if (!nameLink) return null;

        const name = nameLink.textContent?.trim() || 'Unknown Tournament';
        const href = nameLink.getAttribute('href') || '';
        const id = href.split('/').pop() || name.replace(/\s+/g, '_');

        const contentText = cell.textContent || '';
        
        // Date usually follows
        // Simple regex to find date-like patterns if specific class missing
        const dateMatch = contentText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s+\d{4})?)/i);
        const startDate = dateMatch ? dateMatch[0] : '';

        // Prize
        const prizeMatch = contentText.match(/\$[\d,]+/);
        const prizePool = prizeMatch ? prizeMatch[0] : 'TBA';

        // Location
        let location = 'Online';
        const locationEl = cell.querySelector('.flag') || cell.querySelector('img[alt*="flag"]');
        if (locationEl) {
            location = 'Lan'; // If flag exists, likely Lan
        }

        // Tier inference (S-Tier if prize > 200k or big names)
        const isHighTier = prizePool.includes('$1,000,000') || prizePool.includes('$500,000') || prizePool.includes('$250,000');

        return {
            id,
            name,
            logoUrl: '',
            startDate,
            endDate: '',
            prizePool,
            location,
            type: location === 'Online' ? 'Online' : 'Lan',
            stars: isHighTier ? 5 : 4,
            teams: 0,
            status: 'Upcoming'
        };
    } catch (e) {
        return null;
    }
};

const parseLiquipediaRow = (row: Element): HltvEvent | null => {
    try {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return null;

        const nameLink = row.querySelector('a');
        if (!nameLink) return null;
        
        const name = nameLink.textContent?.trim() || 'Unknown';
        const href = nameLink.getAttribute('href') || '';
        const id = href.split('/').pop() || name.replace(/\s+/g, '_');

        const dateText = cells[0]?.textContent?.trim() || '';
        
        let prizePool = 'TBA';
        // Prize is often in the last column
        const lastCell = cells[cells.length - 1];
        if (lastCell && lastCell.textContent?.includes('$')) {
            prizePool = lastCell.textContent.trim();
        }

        return {
            id,
            name,
            logoUrl: '',
            startDate: dateText,
            endDate: '',
            prizePool,
            location: 'Lan', // Table rows usually imply Lan if not specified
            type: 'Lan',
            stars: 4,
            teams: 0,
            status: 'Upcoming'
        };
    } catch (e) {
        return null;
    }
};

const parseLiquipediaCard = (card: Element): HltvEvent | null => {
    try {
        const nameLink = card.querySelector('.name a') || card.querySelector('b a');
        if (!nameLink) return null;

        const name = nameLink.textContent?.trim() || '';
        const href = nameLink.getAttribute('href') || '';
        const id = href.split('/').pop() || name.replace(/\s+/g, '_');

        const dateEl = card.querySelector('.date');
        const startDate = dateEl?.textContent?.trim() || '';

        const prizeEl = card.querySelector('.prize');
        const prizePool = prizeEl?.textContent?.trim() || 'TBA';

        const locationEl = card.querySelector('.location');
        const location = locationEl?.textContent?.trim() || 'Online';

        return {
            id,
            name,
            logoUrl: '',
            startDate,
            endDate: '',
            prizePool,
            location,
            type: location.includes('Online') ? 'Online' : 'Lan',
            stars: 4,
            teams: 0,
            status: 'Upcoming'
        };
    } catch (e) {
        return null;
    }
};
