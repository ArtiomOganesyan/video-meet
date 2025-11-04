import { execSync } from 'child_process';

const name = process.argv[2];

if (!name) {
  console.error(
    '❌ Please provide a migration name: npm run migration:generate my-name',
  );
  process.exit(1);
}

execSync(
  `ts-node --esm ./node_modules/typeorm/cli.js migration:generate src/migrations/${name} --dataSource src/data-source.ts`,
  { stdio: 'inherit' },
);
