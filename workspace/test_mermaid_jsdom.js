import { JSDOM } from 'jsdom';
import * as fs from 'fs';

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="mermaid"></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// dynamic import because mermaid is ESM maybe?
import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false });

    // chart 1: without any replacement
    const chart = `graph TD; A["比赛开始"] --> B{"侦察敌人信息"}; B -->|有信息/对手道具消耗| C["决策: 进攻/爆弹/快攻"]; B -->|无信息/被反清/控制力弱| D["决策: 默认阵型/慢摸/架枪"]; C --> E["执行战术"]; D --> E; E --> F{"回合结果"}; F -->|成功埋包| G["防守包点"]; F -->|包被拆除/被击杀| H["经济管理/下回合调整"]; G --> I["回合获胜"]; H --> I; I --> J["下一回合准备"];`;

    mermaid.render('test-1', chart).then(res => {
        console.log("Success raw =>", res.svg.substring(0, 100));
    }).catch(e => {
        console.error("FAIL raw =>", e.message || e);
    });

    const chart2 = chart.replace(/;\s*/g, ';\n');
    mermaid.render('test-2', chart2).then(res => {
        console.log("Success replaced =>", res.svg.substring(0, 100));
    }).catch(e => {
        console.error("FAIL replaced =>", e.message || e);
    });

}).catch(e => console.error(e));
