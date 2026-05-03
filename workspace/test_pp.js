import puppeteer from 'puppeteer';
import * as http from 'http';
import * as fs from 'fs';

const html = `
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false });

    const chart = \`graph TD;
A["比赛开始"] --> B{"侦察敌人信息"};
B -->|有信息/对手道具消耗| C["决策: 进攻/爆弹/快攻"];
B -->|无信息/被反清/控制力弱| D["决策: 默认阵型/慢摸/架枪"];
C --> E["执行战术"];
D --> E;
E --> F{"回合结果"};
F -->|成功埋包| G["防守包点"];
F -->|包被拆除/被击杀| H["经济管理/下回合调整"];
G --> I["回合获胜"];
H --> I;
I --> J["下一回合准备"];\`;

    window.runTest = async () => {
      try {
        const processedChart = chart
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/;\\s*/g, ';\\n');
            
        const res = await mermaid.render('test-1', processedChart);
        if (res.svg.includes('Syntax error')) {
            return "SVG_SYNTAX_ERROR: " + res.svg.substring(0, 500);
        }
        return "SUCCESS";
      } catch (e) {
        return "ERROR: " + e.message;
      }
    };
  </script>
</head>
<body></body>
</html>
`;

async function test() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });
    server.listen(8080);
    
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:8080');
    
    // Wait for mermaid to initialize
    await page.waitForFunction('window.runTest');
    const result = await page.evaluate(async () => {
        return await window.runTest();
    });
    console.log("RESULT =>", result);
    
    await browser.close();
    server.close();
}
test();
