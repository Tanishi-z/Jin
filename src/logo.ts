import chalk from 'chalk';

/** 白 → 深紅のグラデーションでロゴを出力する */
export function printLogo(): void {
  const lines = [
    '     ██╗██╗███╗   ██╗',
    '     ██║██║████╗  ██║',
    '     ██║██║██╔██╗ ██║',
    '██   ██║██║██║╚██╗██║',
    '╚█████╔╝██║██║ ╚████║',
    ' ╚════╝ ╚═╝╚═╝  ╚═══╝',
  ];

  // 白 (#FFFFFF) → 深紅 (#660000) の6段階グラデーション
  const colors: [number, number, number][] = [
    [255, 255, 255],
    [255, 179, 179],
    [255, 68,  68 ],
    [204, 0,   0  ],
    [153, 0,   0  ],
    [102, 0,   0  ],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [r, g, b] = colors[i];
    console.log(chalk.rgb(r, g, b)(lines[i]));
  }
}
