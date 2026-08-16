#!/usr/bin/env node
import { cli, agentInit, skillInit, hookInit, modelUpdate } from './cli.js';

const args = process.argv.slice(2);
const demo = args.includes('--demo');

// サブコマンド分岐
if (args[0] === 'agent' && args[1] === 'init') {
  agentInit().catch((err: unknown) => { console.error(err); process.exit(1); });
} else if (args[0] === 'skill' && args[1] === 'init') {
  skillInit().catch((err: unknown) => { console.error(err); process.exit(1); });
} else if (args[0] === 'hook' && args[1] === 'init') {
  hookInit().catch((err: unknown) => { console.error(err); process.exit(1); });
} else if (args[0] === 'model' && args[1] === 'update') {
  modelUpdate(args.includes('--force')).catch((err: unknown) => { console.error(err); process.exit(1); });
} else {
  cli({ demo }).catch((err: unknown) => { console.error(err); process.exit(1); });
}
