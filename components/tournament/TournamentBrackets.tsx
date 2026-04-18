import React from 'react';
import { TournamentStageMatch } from '../../types';
import { BracketMatchNode } from './MatchNode';

export const SwissBracket: React.FC<{ matches: TournamentStageMatch[] }> = ({ matches }) => {
    // Fallback list layout if it's not exactly 33 matches of a standard major
    if (matches.length !== 33) {
        return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {matches.map(m => <BracketMatchNode key={m.id} match={m} />)}
        </div>
    }

    const r1 = matches.slice(0, 8);
    const r2_high = matches.slice(8, 12);
    const r2_low = matches.slice(12, 16);
    const r3_high = matches.slice(16, 18);
    const r3_mid = matches.slice(18, 22);
    const r3_low = matches.slice(22, 24);
    const r4_high = matches.slice(24, 27);
    const r4_low = matches.slice(27, 30);
    const r5 = matches.slice(30, 33);

    interface GroupData {
         label: string;
         wrapperClass: string;
         labelClass: string;
         matches: TournamentStageMatch[];
    }

    const colProps = {
        r1: [ { label: '0-0', wrapperClass: 'bg-neutral-50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800/50', labelClass: 'text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700', matches: r1 } ],
        r2: [
            { label: '高分组 1-0', wrapperClass: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30', labelClass: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50', matches: r2_high },
            { label: '低分组 0-1', wrapperClass: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30', labelClass: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50', matches: r2_low },
        ],
        r3: [
            { label: '晋级战 2-0', wrapperClass: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30', labelClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', matches: r3_high },
            { label: '中间组 1-1', wrapperClass: 'bg-neutral-50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800/50', labelClass: 'text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700', matches: r3_mid },
            { label: '淘汰战 0-2', wrapperClass: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30', labelClass: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50', matches: r3_low },
        ],
        r4: [
            { label: '晋级战 2-1', wrapperClass: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30', labelClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', matches: r4_high },
            { label: '淘汰战 1-2', wrapperClass: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30', labelClass: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50', matches: r4_low },
        ],
        r5: [
            { label: '生死战 2-2', wrapperClass: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30', labelClass: 'text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50', matches: r5 },
        ]
    };

    const RenderCol = ({ title, groups }: { title: string, groups: GroupData[] }) => (
        <div className="flex flex-col gap-6 w-[180px] shrink-0">
            <div className="text-center font-bold text-neutral-400 dark:text-neutral-500 text-xs mt-2 relative">
                {title}
            </div>
            <div className="flex flex-col gap-8 flex-1">
                {groups.map((g, idx) => (
                    <div key={idx} className={`p-2 pt-4 rounded-xl border flex flex-col items-center gap-3 relative ${g.wrapperClass}`}>
                        <div className={`absolute -top-2.5 bg-white dark:bg-neutral-900 px-2 text-[10px] font-bold border rounded-full ${g.labelClass}`}>
                            {g.label}
                        </div>
                        {g.matches.map(m => <BracketMatchNode key={m.id} match={m} />)}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full overflow-x-auto py-8 px-8 hide-scrollbar">
            <div className="flex justify-start lg:justify-center items-stretch font-sans gap-8 pb-4 min-w-max mx-auto">
                <RenderCol title="第1轮" groups={colProps.r1} />
                <RenderCol title="第2轮" groups={colProps.r2} />
                <RenderCol title="第3轮" groups={colProps.r3} />
                <RenderCol title="第4轮" groups={colProps.r4} />
                <RenderCol title="第5轮" groups={colProps.r5} />
            </div>
        </div>
    );
}

export const SingleElimBracket: React.FC<{ matches: TournamentStageMatch[] }> = ({ matches }) => {
    const nodeWidth = 180;
    const nodeHeight = 80;
    const colGap = 40;
    const rowGap = 24;

    const totalMatches = matches.length;
    // Support 2, 4, 8, 16 team brackets directly. (1, 3, 7, 15 matches)
    if (![1, 3, 7, 15].includes(totalMatches)) {
        return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {matches.map(m => <BracketMatchNode key={m.id} match={m} />)}
        </div>
    }

    const cols = Math.log2(totalMatches + 1);
    
    // Create grids of nodes
    const rounds: TournamentStageMatch[][] = [];
    let remainingMatches = [...matches];
    for (let i = 0; i < cols; i++) {
        const matchesInThisRound = Math.pow(2, cols - 1 - i);
        rounds.push(remainingMatches.slice(0, matchesInThisRound));
        remainingMatches = remainingMatches.slice(matchesInThisRound);
    }

    const positions: { [round: number]: { [index: number]: number } } = {};
    for (let r = 0; r < cols; r++) {
        positions[r] = {};
        const matchesInRound = Math.pow(2, cols - 1 - r);
        for (let i = 0; i < matchesInRound; i++) {
            if (r === 0) {
                positions[r][i] = i * (nodeHeight + rowGap);
            } else {
                positions[r][i] = (positions[r-1][i*2] + positions[r-1][i*2+1]) / 2;
            }
        }
    }

    const svgWidth = cols * nodeWidth + (cols - 1) * colGap;
    const svgHeight = Math.pow(2, cols - 1) * (nodeHeight + rowGap) - rowGap;

    const roundNames: string[] = [];
    if (cols === 4) roundNames.push("1/8 决赛", "1/4 决赛", "半决赛", "总决赛");
    else if (cols === 3) roundNames.push("1/4 决赛", "半决赛", "总决赛");
    else if (cols === 2) roundNames.push("半决赛", "总决赛");
    else if (cols === 1) roundNames.push("总决赛");
    else {
        for (let i = 0; i < cols; i++) {
             roundNames.push(i === cols - 1 ? "总决赛" : `第 ${i+1} 轮`);
        }
    }

    return (
      <div className="w-full overflow-x-auto py-12 px-8 hide-scrollbar">
        <div 
          className="relative mt-8 mx-auto" 
          style={{ width: `${svgWidth}px`, height: `${svgHeight}px`, minWidth: `${svgWidth}px` }}
        >
          {/* Draw SVG connections first so they are behind */}
          <svg className="absolute top-0 left-0" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
             {rounds.map((roundMatches, r) => {
                 if (r === cols - 1) return null;
                 return roundMatches.map((_, i) => {
                     const startX = r * nodeWidth + (r * colGap) + nodeWidth;
                     const startY = positions[r][i] + nodeHeight / 2;
                     
                     const endX = (r + 1) * nodeWidth + ((r + 1) * colGap);
                     const parentI = Math.floor(i/2);
                     const endY = positions[r+1][parentI] + nodeHeight / 2;
                     
                     const midX = startX + colGap / 2;
                     const radius = 8;
                     let pathD = '';

                     if (Math.abs(startY - endY) < 1) {
                         // Straight line
                         pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                     } else {
                         // Need curved corners
                         const yDir = endY > startY ? 1 : -1;
                         pathD = `M ${startX} ${startY} 
                                  L ${midX - radius} ${startY} 
                                  Q ${midX} ${startY} ${midX} ${startY + radius * yDir}
                                  L ${midX} ${endY - radius * yDir}
                                  Q ${midX} ${endY} ${midX + radius} ${endY}
                                  L ${endX} ${endY}`;
                     }
  
                     return (
                         <path 
                             key={`path-${r}-${i}`}
                             d={pathD}
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="2"
                             className="text-neutral-200 dark:text-neutral-800"
                         />
                     )
                 });
             })}
          </svg>
  
          {/* Draw Nodes */}
          {rounds.map((roundMatches, r) => (
              <React.Fragment key={`round-${r}`}>
                  <div 
                    className="absolute font-bold text-neutral-400 dark:text-neutral-500 text-sm flex justify-center items-center gap-1.5"
                    style={{
                        left: `${r * (nodeWidth + colGap)}px`,
                        top: `-32px`, // Position for the round header
                        width: `${nodeWidth}px`,
                        textAlign: 'center'
                    }}
                  >
                      {r === cols - 1 && (
                          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8l-3.354-1.935a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                      )}
                      <span className={r === cols - 1 ? 'text-amber-600 dark:text-amber-500' : ''}>
                          {roundNames[r]}
                      </span>
                  </div>
                  {roundMatches.map((m, i) => (
                      <div 
                          key={`node-${r}-${i}`}
                          className="absolute"
                          style={{
                              left: `${r * (nodeWidth + colGap)}px`,
                              top: `${positions[r][i]}px`,
                              width: `${nodeWidth}px`
                          }}
                      >
                          <BracketMatchNode 
                              match={m} 
                              shadowColor={r === cols - 1 ? "shadow-[0_0_20px_rgba(245,158,11,0.15)] dark:shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] dark:hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]" : undefined}
                          />
                      </div>
                  ))}
              </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
