const { spawnSync } = require('child_process');

const testFiles = [
  'test/test_auth.js',
  'test/test_avatar.js',
  'test/test_conversations.js',
  'test/test_chips.js',
  'test/test_safety.js',
  'test/test_server_routes.js'
];

console.log('==============================================');
console.log('   RUNNING ALL AUTOMATED TEST SUITES');
console.log('==============================================\n');

let failed = false;

for (const file of testFiles) {
  console.log(`Running: node ${file}...`);
  const result = spawnSync('node', [file], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
  if (result.status !== 0) {
    console.error(`❌ Test suite failed: ${file}`);
    failed = true;
    break;
  } else {
    console.log(`✅ Passed: ${file}\n`);
  }
}

if (failed) {
  console.error('Test run failed!');
  process.exit(1);
} else {
  console.log('==============================================');
  console.log('   ALL TEST SUITES PASSED SUCCESSFULLY! 🎉');
  console.log('==============================================');
  process.exit(0);
}
