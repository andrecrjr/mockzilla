#!/usr/bin/env node

import { run } from '../main.mjs';

const exitCode = await run(process.argv.slice(2));
process.exitCode = exitCode;
