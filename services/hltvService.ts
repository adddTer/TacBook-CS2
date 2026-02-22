import { HltvEvent } from '../types/hltv';

// Fallback Mock Data
const MOCK_EVENTS: HltvEvent[] = [
    {
        id: '1',
        name: 'PGL Major Copenhagen 2024',
        logoUrl: 'https://img-cdn.hltv.org/eventlogo/7148.png?ixlib=java-2.1.0&w=100&s=1e3c2d4c0c5d5e5e5e5e5e5e5e5e5e5e',
        startDate: 'Mar 17th',
        endDate: 'Mar 31st',
        prizePool: '$1,250,000',
        location: 'Copenhagen, Denmark',
        type: 'Lan',
        stars: 5,
        teams: 24,
        status: 'Completed'
    },
    {
        id: '2',
        name: 'IEM Chengdu 2024',
        logoUrl: 'https://img-cdn.hltv.org/eventlogo/7149.png?ixlib=java-2.1.0&w=100&s=1e3c2d4c0c5d5e5e5e5e5e5e5e5e5e5e',
        startDate: 'Apr 8th',
        endDate: 'Apr 14th',
        prizePool: '$250,000',
        location: 'Chengdu, China',
        type: 'Lan',
        stars: 4,
        teams: 16,
        status: 'Completed'
    }
];

const PROXY_URL = 'https://api.allorigins.win/get?url=';
const HLTV_EVENTS_URL = 'https://www.hltv.org/events';

export const fetchHltvEvents = async (): Promise<HltvEvent[]> => {
    try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(HLTV_EVENTS_URL)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const html = data.contents;

        if (!html) throw new Error('No content received from proxy');

        return parseHltvEvents(html);
    } catch (error) {
        console.warn("Failed to fetch real HLTV data, falling back to mock data:", error);
        return MOCK_EVENTS;
    }
};

const parseHltvEvents = (html: string): HltvEvent[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const eventsMap = new Map<string, HltvEvent>();

    // Helper to add event if unique
    const addEvent = (el: Element, status: 'Upcoming' | 'Ongoing' | 'Completed') => {
        const event = parseEventElement(el, status);
        if (event && !eventsMap.has(event.id)) {
            eventsMap.set(event.id, event);
        }
    };

    // 1. Ongoing Events
    const ongoingEvents = doc.querySelectorAll('a.ongoing-event');
    ongoingEvents.forEach(el => addEvent(el, 'Ongoing'));

    // 2. Upcoming Events (Standard Desktop View)
    const upcomingEvents = doc.querySelectorAll('a.small-event');
    upcomingEvents.forEach(el => addEvent(el, 'Upcoming'));

    return Array.from(eventsMap.values());
};

const parseEventElement = (el: Element, status: 'Upcoming' | 'Ongoing' | 'Completed'): HltvEvent | null => {
    try {
        const href = el.getAttribute('href');
        if (!href || !href.includes('/events/')) return null;
        
        const id = href.split('/')[2];
        
        // Name Selectors
        const nameEl = el.querySelector('.event-name-small') || 
                       el.querySelector('.text-ellipsis') || 
                       el.querySelector('.event-name');
        const name = nameEl?.textContent?.trim() || 'Unknown Event';
        
        // Logo
        const logoEl = el.querySelector('img.logo') || el.querySelector('img.event-logo');
        const logoUrl = logoEl?.getAttribute('src') || '';
        
        // Dates
        let startDate = '';
        let endDate = '';
        
        // Try multiple date selectors
        const dateCols = el.querySelectorAll('.col-value.col-date span');
        const dateSingle = el.querySelector('.col-value.col-date');
        const dateMobile = el.querySelector('.event-date');

        if (dateCols.length >= 2) {
            startDate = dateCols[0].textContent?.trim() || '';
            endDate = dateCols[1].textContent?.trim() || '';
        } else if (dateSingle) {
            startDate = dateSingle.textContent?.trim() || '';
        } else if (dateMobile) {
            startDate = dateMobile.textContent?.trim() || '';
        }

        // Prize Pool
        const prizeEl = el.querySelector('.prizePoolEllipsis') || el.querySelector('.event-prize');
        const prizePool = prizeEl?.textContent?.trim() || 'TBA';
        
        // Location
        const locationEl = el.querySelector('.smallCountry .col-value') || 
                           el.querySelector('.event-location') ||
                           el.querySelector('.location-top');
        const location = locationEl?.textContent?.trim().replace(/[\n\t]/g, '') || 'Online';
        
        const type = location.toLowerCase().includes('online') ? 'Online' : 'Lan';

        // Stars
        const stars = el.querySelectorAll('.fa-star').length;

        // Teams
        const teamsEl = el.querySelector('.col-value.col-teams') || el.querySelector('.event-teams');
        const teamsText = teamsEl?.textContent?.trim() || '';
        const teams = parseInt(teamsText) || 0;

        // Basic validation
        if (name === 'Unknown Event') return null;

        return {
            id,
            name,
            logoUrl,
            startDate,
            endDate,
            prizePool,
            location,
            type,
            stars,
            teams,
            status
        };
    } catch (e) {
        console.error("Error parsing event element", e);
        return null;
    }
};
