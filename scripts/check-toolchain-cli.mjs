import { checkToolchain, toolchain } from './check-toolchain.mjs';
import { probe } from './check-environment.mjs';
await checkToolchain();
if (
  process.versions.node !== toolchain.node ||
  (await probe('npm', ['--version'])) !== toolchain.npm
)
  throw Error('Container runtime does not match the declared toolchain');
console.log('Declared acceptance toolchain is consistent.');
